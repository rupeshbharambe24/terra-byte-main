from pathlib import Path

ML_ROOT = Path(__file__).resolve().parent.parent
DATA = ML_ROOT / "data"
RAW = DATA / "raw"
EXTRACTED = DATA / "extracted"
PREPARED = DATA / "prepared"  # resized images + index
RUNS = ML_ROOT / "runs"
REPORTS = ML_ROOT / "reports"
EXPORT = ML_ROOT / "export"
