"""Download the image sources listed in ``sources.py`` into ``ml/data/raw`` and extract archives.

Usage: ``uv run tbml download [key ...]``. Re-running skips files that are already complete.
"""

from __future__ import annotations

import shutil
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import quote

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


def _fetch(url: str, dest: Path, size: int | None = None) -> Path | None:
    """Download ``url`` to ``dest``, resuming a partial ``.part`` file. Returns None on failure."""
    if dest.exists() and (size is None or dest.stat().st_size == size):
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(dest.name + ".part")
    for attempt in range(8):
        have = tmp.stat().st_size if tmp.exists() else 0
        headers = {**UA, "Range": f"bytes={have}-"} if have else dict(UA)
        try:
            with requests.get(url, headers=headers, timeout=120, stream=True) as r:
                if r.status_code == 416:  # already complete
                    break
                if r.status_code in (429, 500, 502, 503, 504):
                    raise requests.HTTPError(f"HTTP {r.status_code}")
                r.raise_for_status()
                mode = "ab" if have and r.status_code == 206 else "wb"
                with open(tmp, mode) as fh:
                    for chunk in r.iter_content(1 << 20):
                        fh.write(chunk)
            if size is None or tmp.stat().st_size >= size:
                break
        except requests.RequestException as exc:
            print(f"  retry {dest.name} ({attempt + 1}): {exc}", flush=True)
            time.sleep(min(60, 3 * (attempt + 1) ** 2))
    else:
        return None
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
    # Some datasets reuse a file name in different folders; macOS file systems are also
    # case-insensitive. Make local names unique.
    seen: dict[str, int] = {}
    unique = []
    for name, url, size in out:
        n = seen.get(name.lower(), 0)
        seen[name.lower()] = n + 1
        unique.append((name if n == 0 else f"dup{n}_{name}", url, size))
    return unique


def _github_tree(src: Source) -> list[tuple[str, str, int | None]]:
    api = f"https://api.github.com/repos/{src.github_repo}/git/trees/master?recursive=1"
    tree = _get(api).json()["tree"]
    prefix = src.github_path.rstrip("/") + "/"
    out = []
    for node in tree:
        if node["type"] == "blob" and node["path"].startswith(prefix):
            rel = node["path"][len(prefix) :]
            raw = f"https://raw.githubusercontent.com/{src.github_repo}/master/" + quote(
                node["path"]
            )
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
        results = list(pool.map(lambda f: _fetch(f[1], raw / f[0], f[2]), files))
    paths = [p for p in results if p is not None]
    if len(paths) < len(files):
        print(f"[{src.key}] {len(files) - len(paths)} file(s) failed; re-run to resume", flush=True)
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
