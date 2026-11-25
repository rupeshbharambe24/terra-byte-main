"""Command line entry point: ``uv run tbml <command>``."""

from __future__ import annotations

import argparse


def main() -> None:
    parser = argparse.ArgumentParser(prog="tbml")
    sub = parser.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("download", help="download and extract the image sources")
    d.add_argument("keys", nargs="*")
    sub.add_parser("prepare", help="build the class taxonomy, resize, dedupe and split")
    t = sub.add_parser("train", help="train the disease model")
    t.add_argument("--epochs", type=int, default=12)
    t.add_argument("--batch-size", type=int, default=64)
    t.add_argument("--limit-minutes", type=float, default=75.0)
    sub.add_parser("evaluate", help="calibrate, evaluate and write the report")
    sub.add_parser("export", help="export the trained model to ONNX + metadata")
    args = parser.parse_args()

    if args.cmd == "download":
        from .download import main as run

        run(args.keys)
    elif args.cmd == "prepare":
        from .prepare import main as run

        run()
    elif args.cmd == "train":
        from .train import main as run

        run(epochs=args.epochs, batch_size=args.batch_size, limit_minutes=args.limit_minutes)
    elif args.cmd == "evaluate":
        from .evaluate import main as run

        run()
    elif args.cmd == "export":
        from .export import main as run

        run()


if __name__ == "__main__":
    main()
