"""Open-Meteo forecast client (no API key) with an in-memory cache.

Weather data by Open-Meteo.com (https://open-meteo.com/), licensed CC BY 4.0. One request per
location returns the past 7 days and the next 7 days (daily) plus hourly values; it is cached for
30 minutes per location rounded to 0.01 degree (about 1 km). If Open-Meteo cannot be reached, a
cached copy up to 6 hours old is served and marked ``stale``; otherwise the caller gets
``WeatherUnavailable``.
"""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

import httpx

logger = logging.getLogger("terrabyte.weather")

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
ATTRIBUTION = "Weather data by Open-Meteo.com"
ATTRIBUTION_URL = "https://open-meteo.com/"
LICENSE = "CC BY 4.0"
LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/"
TIMEZONE = "Asia/Kolkata"
PAST_DAYS = 7
FORECAST_DAYS = 7
CACHE_SECONDS = 30 * 60
STALE_SECONDS = 6 * 60 * 60
TIMEOUT_SECONDS = 8.0

DAILY = (
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_sum",
    "precipitation_probability_max",
    "et0_fao_evapotranspiration",
    "wind_speed_10m_max",
    "relative_humidity_2m_max",
    "relative_humidity_2m_min",
)
HOURLY = (
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "precipitation_probability",
    "wind_speed_10m",
    "weather_code",
)


class WeatherUnavailable(Exception):
    pass


@dataclass
class Forecast:
    lat: float
    lon: float
    fetched_at: datetime
    stale: bool
    daily: list[dict[str, Any]]  # past 7 days + today + 6 days, oldest first
    hourly: list[dict[str, Any]]  # every hour of the same range (local time, IST)


def _key(lat: float, lon: float) -> tuple[float, float]:
    return round(lat, 2), round(lon, 2)


def _column(block: dict[str, Any], name: str, n: int) -> list[Any]:
    values = block.get(name)
    return list(values) if isinstance(values, list) and len(values) == n else [None] * n


def parse(payload: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Open-Meteo JSON -> (daily rows, hourly rows). Raises WeatherUnavailable on a bad shape."""
    try:
        d = payload["daily"]
        h = payload["hourly"]
        days = list(d["time"])
        hours = list(h["time"])
    except (KeyError, TypeError) as exc:
        raise WeatherUnavailable("Unexpected response from Open-Meteo") from exc
    dc = {name: _column(d, name, len(days)) for name in DAILY}
    hc = {name: _column(h, name, len(hours)) for name in HOURLY}
    daily = [
        {
            "date": days[i],
            "weather_code": dc["weather_code"][i],
            "tmax_c": dc["temperature_2m_max"][i],
            "tmin_c": dc["temperature_2m_min"][i],
            "rain_mm": dc["precipitation_sum"][i],
            "rain_probability_pct": dc["precipitation_probability_max"][i],
            "et0_mm": dc["et0_fao_evapotranspiration"][i],
            "wind_max_kmh": dc["wind_speed_10m_max"][i],
            "rh_max_pct": dc["relative_humidity_2m_max"][i],
            "rh_min_pct": dc["relative_humidity_2m_min"][i],
        }
        for i in range(len(days))
    ]
    hourly = [
        {
            "time": hours[i],
            "temp_c": hc["temperature_2m"][i],
            "rh_pct": hc["relative_humidity_2m"][i],
            "precipitation_mm": hc["precipitation"][i],
            "precipitation_probability_pct": hc["precipitation_probability"][i],
            "wind_kmh": hc["wind_speed_10m"][i],
            "weather_code": hc["weather_code"][i],
        }
        for i in range(len(hours))
    ]
    return daily, hourly


class WeatherService:
    """Fetches and caches forecasts. ``transport`` lets tests replace the network."""

    def __init__(self, transport: httpx.BaseTransport | None = None) -> None:
        self.transport = transport
        self._cache: dict[tuple[float, float], tuple[float, Forecast]] = {}
        self._lock = threading.Lock()

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

    def _fetch(self, lat: float, lon: float) -> dict[str, Any]:
        params = {
            "latitude": lat,
            "longitude": lon,
            "daily": ",".join(DAILY),
            "hourly": ",".join(HOURLY),
            "timezone": TIMEZONE,
            "past_days": PAST_DAYS,
            "forecast_days": FORECAST_DAYS,
            "wind_speed_unit": "kmh",
        }
        with httpx.Client(timeout=TIMEOUT_SECONDS, transport=self.transport) as client:
            res = client.get(FORECAST_URL, params=params)
            res.raise_for_status()
            return res.json()

    def forecast(self, lat: float, lon: float) -> Forecast:
        key = _key(lat, lon)
        now = time.monotonic()
        with self._lock:
            cached = self._cache.get(key)
        if cached and now - cached[0] < CACHE_SECONDS:
            return cached[1]
        try:
            daily, hourly = parse(self._fetch(*key))
        except (httpx.HTTPError, ValueError, WeatherUnavailable) as exc:
            logger.warning("Open-Meteo request failed: %s", type(exc).__name__)
            if cached and now - cached[0] < STALE_SECONDS:
                f = cached[1]
                return Forecast(f.lat, f.lon, f.fetched_at, True, f.daily, f.hourly)
            raise WeatherUnavailable("Weather is unavailable right now.") from exc
        forecast = Forecast(key[0], key[1], datetime.now().astimezone(), False, daily, hourly)
        with self._lock:
            self._cache[key] = (now, forecast)
        return forecast


def split_days(
    forecast: Forecast, today: date
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """(past days, today and later) from the daily rows."""
    iso = today.isoformat()
    past = [d for d in forecast.daily if d["date"] < iso]
    future = [d for d in forecast.daily if d["date"] >= iso]
    return past, future


def future_hours(forecast: Forecast, now_local: datetime) -> list[dict[str, Any]]:
    """Hourly rows from the current hour on (times are IST, ``YYYY-MM-DDTHH:MM``)."""
    stamp = now_local.strftime("%Y-%m-%dT%H:00")
    return [h for h in forecast.hourly if h["time"] >= stamp]
