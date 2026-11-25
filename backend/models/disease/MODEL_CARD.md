# Model card: TerraByte crop disease model `disease-mnv3l-v1`

Image classifier for leaf photos of the crops listed in `model.json`. The farmer picks the crop; the app masks the output to that crop's classes. Photos that do not look like a supported leaf are rejected. Results are **guidance only**, not a diagnosis.

- Architecture: MobileNetV3-Large 1.0 (timm `mobilenetv3_large_100.ra_in1k`), fine-tuned, 224 px input.
- Training code and evaluation: `ml/` in this repository (`uv run tbml ...`).
- Evaluation report: `ml/reports/disease_model_v1.md`.

## Licence of these weights

The code in this repository is MIT. These **weights** are released under **CC BY 4.0**, with attribution to the datasets below (all training data is CC0 or CC BY 4.0; PlantVillage was used through the CC0 derivative by Geetharamani & Pandian). The backbone was pretrained on ImageNet (timm weights, Apache-2.0); ImageNet's terms restrict the images to non-commercial research, and whether that carries over to fine-tuned weights is not settled.

## Datasets

| dataset | URL | licence | use |
|---|---|---|---|
| PlantVillage derivative without augmentation (Geetharamani & Pandian), 39 classes | https://data.mendeley.com/datasets/tywbtsjrjv/1 | CC0-1.0 | training |
| Niphad Grape Leaf Disease Dataset (NGLD) | https://data.mendeley.com/datasets/8nnd2ypcv3/5 | CC-BY-4.0 | training |
| Sugarcane Leaf Disease Dataset (Maharashtra) | https://data.mendeley.com/datasets/9424skmnrk/1 | CC-BY-4.0 | training |
| Sugarcane Leaf Image Dataset (12 classes) | https://data.mendeley.com/datasets/9twjtv92vk/1 | CC-BY-4.0 | evaluation only |
| Pigeonpea leaf disease dataset (PPLD) | https://data.mendeley.com/datasets/bd553pdtny/1 | CC-BY-4.0 | training |
| Cotton Leaf Image Dataset for Disease Classification (original images) | https://data.mendeley.com/datasets/t9hgvk2h9p/1 | CC-BY-4.0 | training |
| Cotton Leaf Disease Dataset with Severity Levels (original images) | https://data.mendeley.com/datasets/74jsdxtmx2/3 | CC-BY-4.0 | evaluation only |
| Rice Leaf Disease Image Samples (Sethy et al. 2020) | https://data.mendeley.com/datasets/fwcj7stb8r/2 | CC-BY-4.0 | training |
| Multi-Class Soybean Leaf Disease Dataset | https://data.mendeley.com/datasets/6fhphxg297/2 | CC-BY-4.0 | training |
| Onion dataset (COLD) | https://data.mendeley.com/datasets/7nxxn4gj5s/2 | CC-BY-4.0 | not used (no disease labels) |
| Chili Leaf Diseases in the Krishna River Basin (original images) | https://data.mendeley.com/datasets/ymt8k9bjkn/3 | CC-BY-4.0 | training |
| BananaLSD (banana leaf spot diseases) | https://data.mendeley.com/datasets/9tb7k297ff/1 | CC-BY-4.0 | evaluation only |
| PlantDoc classification test split | https://github.com/pratikkayal/PlantDoc-Dataset | Repo CC-BY-4.0; images web-scraped, copyright unknown | evaluation only |
| Imagenette 160 px (10-class ImageNet subset, fast.ai) | https://github.com/fastai/imagenette | Apache-2.0 (dataset tooling); images are ImageNet images (ImageNet terms, same ambiguity as the ImageNet-pretrained backbone) | training |

## Limitations

- Trained mostly on single-location datasets; expect lower accuracy on new farms. See the cross-source numbers in the evaluation report.
- Not supported: onion, okra, brinjal, pomegranate, banana, wheat, chickpea and any crop not listed in `model.json`.
- Treatment advice is not produced by the model; it comes from a curated, cited table.
