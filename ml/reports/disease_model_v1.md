# Crop disease model `disease-mnv3l-v1`: evaluation report

Evaluated on 2026-11-25 by `uv run tbml evaluate` (reproducible from `ml/`). Backbone: MobileNetV3-Large 1.0 (timm `mobilenetv3_large_100.ra_in1k`, ImageNet-pretrained, Apache-2.0 weights), 224 px, one head over 55 (crop, condition) classes + `other`. 16540 training images, 3545 validation images.

## How to read this

- **In-domain test** = held-out images from the *same* datasets as training. These numbers are optimistic: photos in one dataset share camera, background and season.
- **Cross-source test** = datasets never used in training (PlantDoc web/field photos, cotton from Pune, a second sugarcane dataset). This is the better predictor of field performance.
- The app masks the logits to the crop the farmer selected ("top-1"); the unmasked column shows what happens without that.
- **Calibration**: the in-domain validation split is nearly perfect, so thresholds tuned on it were degenerate (a first run rejected 60-94 % of the cross-source leaf photos). Temperature and thresholds are therefore fitted on a *calibration half* of the cross-source photos (n=1474, chosen by a hash of the file path); the cross-source table below uses only the *other* half.
- Temperature T = 0.95. Rejection threshold on P(other) = 0.1134 (90 % of calibration leaf photos pass). A result is **confident** when the crop-masked top-1 probability is >= 0.93 (>= 90 % precision on calibration); otherwise **uncertain** (top-3 shown, expert advice suggested, no chemical options).

## In-domain test (held-out images, same sources)

| crop | n | top-1 | top-3 | top-1 without crop mask | ECE | falsely rejected | confident | accuracy when confident |
|---|---|---|---|---|---|---|---|---|
| capsicum | 90 | 100.0 % | 100.0 % | 98.9 % | 0.015 | 2.2 % | 94.4 % | 100.0 % |
| chilli | 270 | 99.6 % | 100.0 % | 99.6 % | 0.019 | 0.0 % | 96.7 % | 100.0 % |
| cotton | 168 | 98.2 % | 100.0 % | 98.2 % | 0.027 | 0.0 % | 88.1 % | 100.0 % |
| grape | 475 | 98.9 % | 99.8 % | 98.9 % | 0.019 | 0.2 % | 94.3 % | 100.0 % |
| maize | 180 | 96.7 % | 100.0 % | 96.7 % | 0.033 | 0.0 % | 81.7 % | 99.3 % |
| pigeonpea | 136 | 94.9 % | 99.3 % | 94.9 % | 0.05 | 0.0 % | 67.6 % | 100.0 % |
| potato | 113 | 100.0 % | 100.0 % | 99.1 % | 0.008 | 0.0 % | 97.3 % | 100.0 % |
| rice | 344 | 100.0 % | 100.0 % | 100.0 % | 0.009 | 0.0 % | 98.8 % | 100.0 % |
| soybean | 116 | 100.0 % | 100.0 % | 99.1 % | 0.028 | 0.0 % | 89.7 % | 100.0 % |
| sugarcane | 345 | 98.0 % | 100.0 % | 98.0 % | 0.034 | 0.0 % | 80.9 % | 99.6 % |
| tomato | 450 | 97.8 % | 99.3 % | 97.3 % | 0.039 | 0.2 % | 83.3 % | 100.0 % |

## Cross-source test (sources never trained on)

| source: crop | n | top-1 | top-3 | top-1 without crop mask | ECE | falsely rejected | confident | accuracy when confident |
|---|---|---|---|---|---|---|---|---|
| cotton_pune: cotton | 504 | 59.3 % | 94.8 % | 53.4 % | 0.09 | 21.4 % | 7.5 % | 84.2 % |
| plantdoc_test: capsicum | 7 | 71.4 % | 100.0 % | 28.6 % | 0.328 | 0.0 % | 14.3 % | 100.0 % |
| plantdoc_test: grape | 11 | 54.5 % | 90.9 % | 36.4 % | 0.38 | 0.0 % | 18.2 % | 100.0 % |
| plantdoc_test: maize | 13 | 30.8 % | 92.3 % | 23.1 % | 0.598 | 0.0 % | 23.1 % | 33.3 % |
| plantdoc_test: potato | 6 | 66.7 % | 100.0 % | 0.0 % | 0.208 | 0.0 % | 0.0 % | – |
| plantdoc_test: soybean | 5 | 80.0 % | 80.0 % | 0.0 % | 0.466 | 0.0 % | 0.0 % | – |
| plantdoc_test: tomato | 38 | 36.8 % | 63.2 % | 15.8 % | 0.285 | 13.2 % | 0.0 % | – |
| sugarcane_12: sugarcane | 991 | 39.2 % | 81.5 % | 36.6 % | 0.297 | 4.5 % | 13.5 % | 93.3 % |

## Out-of-distribution rejection

Synthetic images of the same *kinds* (flat colours, noise, gradients) were used as training negatives, but these test images were generated with different seeds. Banana leaves and the PlantDoc photos of unsupported crops were never seen in training (PlantVillage lab photos of apple, cherry, etc. were).

| set | n | rejected | confident diagnosis if not rejected (avg over crops) |
|---|---|---|---|
| imagenette_val | 800 | 100.0 % | 0.0 % |
| synthetic | 200 | 100.0 % | 0.0 % |
| plantdoc_unsupported_crop | 80 | 52.5 % | 1.1 % |
| banana_leaf | 2501 | 3.6 % | 2.8 % |
| in-domain negatives (test split 'other') | 858 | 99.9 % | 0.0 % |
| plain white image | 1 | 100.0 % | – |
| plain black image | 1 | 100.0 % | – |
| plain grey image | 1 | 100.0 % | – |

## Data sources and licences

| key | dataset | licence | origin | use |
|---|---|---|---|---|
| plantvillage | [PlantVillage derivative without augmentation (Geetharamani & Pandian), 39 classes](https://data.mendeley.com/datasets/tywbtsjrjv/1) | CC0-1.0 | PlantVillage lab images (USA) + background-only images | training |
| ngld_grape | [Niphad Grape Leaf Disease Dataset (NGLD)](https://data.mendeley.com/datasets/8nnd2ypcv3/5) | CC-BY-4.0 | Niphad, Nashik, Maharashtra (field, mobile) | training |
| sugarcane_mh | [Sugarcane Leaf Disease Dataset (Maharashtra)](https://data.mendeley.com/datasets/9424skmnrk/1) | CC-BY-4.0 | Maharashtra (field, smartphones) | training |
| sugarcane_12 | [Sugarcane Leaf Image Dataset (12 classes)](https://data.mendeley.com/datasets/9twjtv92vk/1) | CC-BY-4.0 | India (field) | evaluation only |
| ppld_pigeonpea | [Pigeonpea leaf disease dataset (PPLD)](https://data.mendeley.com/datasets/bd553pdtny/1) | CC-BY-4.0 | Vijayapura, Karnataka (field) | training |
| cotton_t9 | [Cotton Leaf Image Dataset for Disease Classification (original images)](https://data.mendeley.com/datasets/t9hgvk2h9p/1) | CC-BY-4.0 | India (field) | training |
| cotton_pune | [Cotton Leaf Disease Dataset with Severity Levels (original images)](https://data.mendeley.com/datasets/74jsdxtmx2/3) | CC-BY-4.0 | Pune, Maharashtra (field) | evaluation only |
| rice_sethy | [Rice Leaf Disease Image Samples (Sethy et al. 2020)](https://data.mendeley.com/datasets/fwcj7stb8r/2) | CC-BY-4.0 | Western Odisha (field) | training |
| soybean_multi | [Multi-Class Soybean Leaf Disease Dataset](https://data.mendeley.com/datasets/6fhphxg297/2) | CC-BY-4.0 | not stated (field) | training |
| onion_cold | [Onion dataset (COLD)](https://data.mendeley.com/datasets/7nxxn4gj5s/2) | CC-BY-4.0 | India (field) | not used (no disease labels) |
| chilli_krishna | [Chili Leaf Diseases in the Krishna River Basin (original images)](https://data.mendeley.com/datasets/ymt8k9bjkn/3) | CC-BY-4.0 | Karnataka & Andhra Pradesh (field) | training |
| banana_lsd | [BananaLSD (banana leaf spot diseases)](https://data.mendeley.com/datasets/9tb7k297ff/1) | CC-BY-4.0 | field | evaluation only |
| plantdoc_test | [PlantDoc classification test split](https://github.com/pratikkayal/PlantDoc-Dataset) | Repo CC-BY-4.0; images web-scraped, copyright unknown | web / field photos | evaluation only |
| imagenette | [Imagenette 160 px (10-class ImageNet subset, fast.ai)](https://github.com/fastai/imagenette) | Apache-2.0 (dataset tooling); images are ImageNet images (ImageNet terms, same ambiguity as the ImageNet-pretrained backbone) | web photos (non-plant objects) | training |

## Known limitations

- Most training datasets come from one place and season; accuracy on a farmer's photo will be lower than the in-domain numbers. Several crops have no cross-source test.
- Onion, okra, brinjal, pomegranate, banana, wheat and chickpea are not supported yet.
- The rejection gate lets about 90 % of field leaf photos through, and it does not reliably reject leaves of unsupported crops (see banana): the farmer's crop choice and the 'uncertain' band carry much of the safety.
- Cross-source accuracy is far below in-domain accuracy; quote the cross-source numbers, not the in-domain ones.
