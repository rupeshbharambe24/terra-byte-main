"""Download the image sources listed in ``sources.py`` into ``ml/data/raw`` and extract archives.

Usage: ``uv run tbml download [key ...]``. Re-running skips files that are already complete.
"""

from __future__ import annotations

import shutil
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests

from .paths import EXTRACTED, RAW
from .sources import BY_KEY, SOURCES, Source

UA = {"User-Agent": "terrabyte-ml/0.1 (+https://github.com/rupeshbharambe24/terra-byte-main)"}
MENDELEY_API = "https://data.mendeley.com/public-api/datasets/{}"
ARCHIVE_EXT = (".zip", ".rar", ".7z", ".tgz", ".tar.gz")


def _get(url: str, **kw) -> requests.Response:
    for attempt in range(5):
        try:
            r = requests.get(url, headers=UA, timeout=120, **kw)
            if r.status_code in (429, 500, 502, 503, 504):
                raise requests.HTTPError(f"HTTP {r.status_code}")
            r.raise_for_status()
            return r
        except (requests.RequestException, requests.HTTPError):
            if attempt == 4:
                raise
            time.sleep(2 * (attempt + 1) ** 2)
    raise RuntimeError("unreachable")


def _fetch(url: str, dest: Path, size: int | None = None) -> Path:
    if dest.exists() and (size is None or dest.stat().st_size == size):
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    with _get(url, stream=True) as r, open(tmp, "wb") as fh:
        for chunk in r.iter_content(1 << 20):
            fh.write(chunk)
    tmp.rename(dest)
    return dest


def _mendeley_files(src: Source) -> list[tuple[str, str, int | None]]:
    meta = _get(MENDELEY_API.format(src.mendeley_id)).json()
    out = []
    for f in meta.get("files", []):
        name = f.get("filename")
        cd = f.get("content_details", {})
        if src.kind == "mendeley_files" and name not in src.files:
            continue
        out.append((name, cd["download_url"], cd.get("size")))
    return out


def _github_tree(src: Source) -> list[tuple[str, str, int | None]]:
    api = f"https://api.github.com/repos/{src.github_repo}/git/trees/master?recursive=1"
    tree = _get(api).json()["tree"]
    prefix = src.github_path.rstrip("/") + "/"
    out = []
    for node in tree:
        if node["type"] == "blob" and node["path"].startswith(prefix):
            rel = node["path"][len(prefix):]
            raw = f"https://raw.githubusercontent.com/{src.github_repo}/master/{node['path']}"
            out.append((rel, raw, node.get("size")))
    return out


def _extract(archive: Path, dest: Path) -> None:
    marker = dest / f".extracted-{archive.name}"
    if marker.exists():
        return
    dest.mkdir(parents=True, exist_ok=True)
    # bsdtar (libarchive) reads zip, rar (v4/v5) and 7z.
    subprocess.run(["bsdtar", "-xf", str(archive), "-C", str(dest)], check=True)  # noqa: S603,S607
    marker.touch()


def download(src: Source) -> None:
    raw = RAW / src.key
    raw.mkdir(parents=True, exist_ok=True)
    if src.kind == "url":
        name = src.download_url.rsplit("/", 1)[-1]
        files = [(name, src.download_url, None)]
    elif src.kind == "github_tree":
        files = _github_tree(src)
    else:
        files = _mendeley_files(src)
    print(f"[{src.key}] {len(files)} file(s)", flush=True)
    with ThreadPoolExecutor(max_workers=8) as pool:
        paths = list(pool.map(lambda f: _fetch(f[1], raw / f[0], f[2]), files))
    for p in paths:
        if p.name.lower().endswith(ARCHIVE_EXT):
            _extract(p, EXTRACTED / src.key)
    if not any(p.name.lower().endswith(ARCHIVE_EXT) for p in paths):
        # Loose files: expose them under extracted/ too, without copying.
        link = EXTRACTED / src.key
        if not link.exists():
            link.parent.mkdir(parents=True, exist_ok=True)
            link.symlink_to(raw.resolve(), target_is_directory=True)
    print(f"[{src.key}] done", flush=True)


def main(keys: list[str]) -> None:
    if not shutil.which("bsdtar"):
        raise SystemExit("bsdtar is required to extract the archives")
    chosen = [BY_KEY[k] for k in keys] if keys else SOURCES
    for src in chosen:
        try:
            download(src)
        except Exception as exc:  # noqa: BLE001 - keep going with the other sources
            print(f"[{src.key}] FAILED: {exc}", flush=True)
