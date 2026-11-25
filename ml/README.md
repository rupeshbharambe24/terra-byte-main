# TerraByte ML: crop disease model

Training and evaluation code for the leaf-photo disease check. It is a separate uv project:
PyTorch, timm and torchvision are needed only here, never in the backend (which serves the
exported ONNX file with onnxruntime on CPU).

## Reproduce

```bash
cd ml
uv sync
uv run tbml download     # ~4.5 GB into ml/data/raw (git-ignored), resumable
uv run tbml prepare      # map classes, cap, resize to 256 px, pHash-dedupe, split -> data/prepared/index.csv
uv run tbml train        # MobileNetV3-Large on MPS (or CPU), best checkpoint -> runs/disease_v1/best.pt
uv run tbml evaluate     # temperature scaling, thresholds, report -> reports/disease_model_v1.md
uv run tbml export       # ONNX + model.json + MODEL_CARD.md -> ../backend/models/disease/
```

Then, in `backend/`: `uv run terrabyte-load-model-metrics` stores the evaluation in
`model_evaluations` so the admin "AI model performance" page shows it.

## Design

- **Classes**: one head over every supported (crop, condition) class plus `other`
  (`terrabyte_ml/taxonomy.py`). The farmer picks the crop; the backend masks the logits to that
  crop's classes.
- **Rejection**: `other` is trained with negatives (PlantVillage photos of crops we do not support,
  CC0 background-only photos, Imagenette photos, synthetic blank/noise/gradient images). The
  backend also rejects blank, very dark, washed-out or very blurry photos before running the model.
  The threshold on P(other) lets 95 % of validation leaf photos through.
- **Calibration**: temperature scaling on the validation split; "confident" needs a crop-masked
  top-1 probability that gave >= 95 % precision on validation. Everything else is "uncertain"
  (top-3 shown, "ask an expert" offered, no chemical advice).
- **Data hygiene**: only original (non-augmented) archives, per-class caps (PlantVillage 300,
  others 900), exact perceptual-hash duplicates removed before the split (the rice set contained
  many), splits seeded per class so adding test-only sources never changes the training split.
- **Honest evaluation**: in-domain test (held-out images of the training sources), cross-source
  test (sources never trained on: PlantDoc, cotton from Pune, a second sugarcane dataset), and
  out-of-distribution rejection (banana leaves, unsupported crops in PlantDoc, Imagenette val,
  fresh synthetic images, pure white/black/grey images). See `reports/disease_model_v1.md`.

## Datasets and licences

All training data is CC0 or CC BY 4.0; the list with URLs, licences and origin is in
`terrabyte_ml/sources.py` and is repeated in the report and in the model card. PlantVillage is used
through the **CC0** derivative by Geetharamani & Pandian (Mendeley `tywbtsjrjv`), so the weights
can be published under **CC BY 4.0**. PlantDoc (web-scraped images of unknown copyright) and
BananaLSD are used for evaluation only. Imagenette images are ImageNet images: they are used as
"not a leaf" negatives, which carries the same licensing ambiguity as the ImageNet-pretrained
backbone (noted in the model card).

Not covered yet (no permissive dataset found or not enough time): onion (the COLD onion set is a
time series without disease labels), okra, brinjal, pomegranate (fruit images only), banana,
wheat, chickpea.
