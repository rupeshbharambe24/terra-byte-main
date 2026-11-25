"""Weather, irrigation (FAO-56), soil tests, fertilizer doses and the crop calendar."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import select

from terrabyte.agro import fertilizer as fert
from terrabyte.agro import irrigation as irr
from terrabyte.agro.crops import CROP_KEYS, REGIONS, resolve_crop
from terrabyte.errors import ApiError
from terrabyte.models import Field, SoilTest, User, UserRole
from terrabyte.reference import LAST_VERIFIED
from terrabyte.schemas.agro import DoseIn, SoilTestIn, SoilTestOut
from terrabyte.schemas.users import Lat, Lon
from terrabyte.security import CurrentUser, DbSession, require_role
from terrabyte.services import agro as svc
from terrabyte.services.weather import WeatherService

router = APIRouter(tags=["agronomy"])

FarmerUser = Annotated[User, Depends(require_role(UserRole.farmer))]


def get_weather_service(request: Request) -> WeatherService:
    return request.app.state.weather


Weather = Annotated[WeatherService, Depends(get_weather_service)]


def _own_field(db: DbSession, farmer: User, field_id: int) -> Field:
    field = db.get(Field, field_id)
    if field is None or field.owner_id != farmer.id:
        raise ApiError(404, "not_found", "Field not found.")
    return field


# ---- Weather ------------------------------------------------------------------------------------


@router.get("/weather")
def weather(
    user: CurrentUser,
    db: DbSession,
    service: Weather,
    lat: Lat = None,
    lon: Lon = None,
    field_id: int | None = None,
) -> dict[str, Any]:
    """7-day forecast, next 48 hours and rule-based advisories for a location: the given
    lat/lon, one of the farmer's fields, or the profile location."""
    if (lat is None) != (lon is None):
        raise ApiError(422, "validation_error", "Give both lat and lon.")
    field = _own_field(db, user, field_id) if field_id is not None else None
    location = svc.location_for(user, field, lat, lon)
    forecast = svc.get_forecast(service, location["lat"], location["lon"])
    return svc.weather_payload(forecast, location)


# ---- Irrigation ---------------------------------------------------------------------------------


@router.get("/irrigation/meta")
def irrigation_meta(_user: FarmerUser) -> dict[str, Any]:
    return {
        "supported_crops": irr.supported_crops(),
        "soil_textures": irr.SOIL_AWC_MM_PER_M,
        "soil_types": irr.SOIL_TYPE_TEXTURE,
        "soil_source": irr.SOIL_AWC_SOURCE,
    }


@router.get("/fields/{field_id}/irrigation")
def field_irrigation(
    field_id: int,
    farmer: FarmerUser,
    db: DbSession,
    service: Weather,
    soil_texture: Literal[
        "sand",
        "loamy_sand",
        "sandy_loam",
        "loam",
        "silt_loam",
        "silty_clay_loam",
        "silty_clay",
        "clay",
    ]
    | None = None,
    awc_mm_per_m: Annotated[float | None, Query(ge=30, le=300)] = None,
    last_irrigated: date | None = None,
) -> dict[str, Any]:
    """FAO-56 crop water need and a root-zone water balance for the field's crop."""
    field = _own_field(db, farmer, field_id)
    return svc.irrigation_for(service, farmer, field, soil_texture, awc_mm_per_m, last_irrigated)


# ---- Soil tests ---------------------------------------------------------------------------------


@router.get("/soil-tests", response_model=list[SoilTestOut])
def list_soil_tests(
    farmer: FarmerUser, db: DbSession, field_id: int | None = None
) -> list[SoilTestOut]:
    stmt = (
        select(SoilTest)
        .join(Field, Field.id == SoilTest.field_id)
        .where(Field.owner_id == farmer.id)
        .order_by(SoilTest.test_date.desc(), SoilTest.id.desc())
    )
    if field_id is not None:
        stmt = stmt.where(SoilTest.field_id == field_id)
    return [SoilTestOut.model_validate(t) for t in db.scalars(stmt)]


@router.post(
    "/fields/{field_id}/soil-tests", response_model=SoilTestOut, status_code=status.HTTP_201_CREATED
)
def create_soil_test(
    field_id: int, data: SoilTestIn, farmer: FarmerUser, db: DbSession
) -> SoilTestOut:
    field = _own_field(db, farmer, field_id)
    values = data.model_dump()
    if all(
        values[k] is None
        for k in (
            "n_kg_ha",
            "p_kg_ha",
            "k_kg_ha",
            "oc_pct",
            "zn_ppm",
            "fe_ppm",
            "mn_ppm",
            "cu_ppm",
            "b_ppm",
            "s_ppm",
            "ph",
            "ec_ds_m",
        )
    ):
        raise ApiError(422, "validation_error", "Enter at least one value from the soil test.")
    test = SoilTest(field_id=field.id, **values)
    db.add(test)
    db.commit()
    db.refresh(test)
    return SoilTestOut.model_validate(test)


@router.delete("/soil-tests/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_soil_test(test_id: int, farmer: FarmerUser, db: DbSession) -> None:
    test = db.get(SoilTest, test_id)
    if test is None or db.get(Field, test.field_id).owner_id != farmer.id:  # type: ignore[union-attr]
        raise ApiError(404, "not_found", "Soil test not found.")
    db.delete(test)
    db.commit()


# ---- Fertilizer ---------------------------------------------------------------------------------


@router.get("/fertilizer/options")
def fertilizer_options(
    _user: FarmerUser, crop: Annotated[str, Query(min_length=2, max_length=40)]
) -> dict[str, Any]:
    key = resolve_crop(crop)
    if key is None:
        raise ApiError(422, "unknown_crop", "Unknown crop.")
    return {
        "crop": key,
        "options": [svc.option_out(o) for o in fert.rdf_options(key)],
        "carriers": list(fert.PHOSPHORUS_CARRIERS),
        "last_verified": LAST_VERIFIED,
    }


@router.get("/fertilizer/crops")
def fertilizer_crops(_user: FarmerUser) -> list[dict[str, Any]]:
    """Crops with at least one RDF entry usable for a calculation."""
    out = []
    for crop in CROP_KEYS:
        options = fert.rdf_options(crop)
        out.append(
            {
                "crop": crop,
                "usable": sum(o.usable for o in options),
                "total": len(options),
            }
        )
    return out


@router.post("/fertilizer/dose")
def fertilizer_dose(data: DoseIn, farmer: FarmerUser, db: DbSession) -> dict[str, Any]:
    """Soil-test-adjusted dose and product quantities. Pure calculation; nothing is stored."""
    crop = resolve_crop(data.crop)
    if crop is None:
        raise ApiError(422, "unknown_crop", "Unknown crop.")
    area = data.area_acres
    test = None
    season = None
    if data.field_id is not None:
        field = _own_field(db, farmer, data.field_id)
        area = area or field.area_acres
        if resolve_crop(field.current_crop) == crop:
            season = field.season
    option = fert.rdf_option(crop, data.rdf_id, season)
    if option is None:
        raise ApiError(404, "no_rdf", "No recommended dose is available for this crop yet.")
    if not option.usable:
        raise ApiError(
            422, "rdf_not_usable", "This recommendation cannot be used for a calculation."
        )
    if data.soil_test_id is not None:
        test = db.get(SoilTest, data.soil_test_id)
        owner = db.get(Field, test.field_id).owner_id if test else None
        if test is None or owner != farmer.id:
            raise ApiError(404, "not_found", "Soil test not found.")
    return svc.dose_for(crop, option, area, test, data.scheme, data.carrier)


# ---- Crop calendar ------------------------------------------------------------------------------


@router.get("/crop-calendar")
def crop_calendar(
    user: CurrentUser,
    district: Annotated[str | None, Query(max_length=80)] = None,
) -> dict[str, Any]:
    """Sowing windows, durations, seed rates and spacing for the district's region."""
    return svc.calendar_for(district or user.district)


@router.get("/regions")
def regions(_user: CurrentUser) -> dict[str, list[str]]:
    return {k: list(v) for k, v in REGIONS.items()}
