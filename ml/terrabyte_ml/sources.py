"""Image sources used for the disease model, with their licences.

Every source here was chosen because its licence allows training and publishing weights (CC0 or
CC BY 4.0), except the two marked ``eval_only`` which are used only to measure, never to train.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Source:
    key: str
    title: str
    url: str
    licence: str
    origin: str
    kind: str  # mendeley_files | mendeley_all | url | github_tree
    files: tuple[str, ...] = ()
    mendeley_id: str = ""
    download_url: str = ""
    github_repo: str = ""
    github_path: str = ""
    eval_only: bool = False
    notes: str = ""
    extra: dict = field(default_factory=dict)


SOURCES: list[Source] = [
    Source(
        key="plantvillage",
        title="PlantVillage derivative without augmentation (Geetharamani & Pandian), 39 classes",
        url="https://data.mendeley.com/datasets/tywbtsjrjv/1",
        licence="CC0-1.0",
        origin="PlantVillage lab images (USA) + background-only images",
        kind="mendeley_files",
        mendeley_id="tywbtsjrjv",
        files=("Plant_leaf_diseases_dataset_without_augmentation.zip",),
        notes="Lab images, uniform background. Capped per class. Background_without_leaves and the "
        "unsupported crops are used as 'not a supported leaf' negatives.",
    ),
    Source(
        key="ngld_grape",
        title="Niphad Grape Leaf Disease Dataset (NGLD)",
        url="https://data.mendeley.com/datasets/8nnd2ypcv3/5",
        licence="CC-BY-4.0",
        origin="Niphad, Nashik, Maharashtra (field, mobile)",
        kind="mendeley_all",
        mendeley_id="8nnd2ypcv3",
    ),
    Source(
        key="sugarcane_mh",
        title="Sugarcane Leaf Disease Dataset (Maharashtra)",
        url="https://data.mendeley.com/datasets/9424skmnrk/1",
        licence="CC-BY-4.0",
        origin="Maharashtra (field, smartphones)",
        kind="mendeley_files",
        mendeley_id="9424skmnrk",
        files=("Sugarcane Leaf Disease Dataset.rar",),
    ),
    Source(
        key="sugarcane_12",
        title="Sugarcane Leaf Image Dataset (12 classes)",
        url="https://data.mendeley.com/datasets/9twjtv92vk/1",
        licence="CC-BY-4.0",
        origin="India (field)",
        kind="mendeley_files",
        mendeley_id="9twjtv92vk",
        files=("Diseases.zip", "Healthy Leaves.zip"),
        notes="Used as the cross-source test set for sugarcane (classes shared with sugarcane_mh).",
    ),
    Source(
        key="ppld_pigeonpea",
        title="Pigeonpea leaf disease dataset (PPLD)",
        url="https://data.mendeley.com/datasets/bd553pdtny/1",
        licence="CC-BY-4.0",
        origin="Vijayapura, Karnataka (field)",
        kind="mendeley_files",
        mendeley_id="bd553pdtny",
        files=("PPLD.zip",),
    ),
    Source(
        key="cotton_t9",
        title="Cotton Leaf Image Dataset for Disease Classification (original images)",
        url="https://data.mendeley.com/datasets/t9hgvk2h9p/1",
        licence="CC-BY-4.0",
        origin="India (field)",
        kind="mendeley_files",
        mendeley_id="t9hgvk2h9p",
        files=("Cotton_Original_Dataset.zip",),
    ),
    Source(
        key="cotton_pune",
        title="Cotton Leaf Disease Dataset with Severity Levels (original images)",
        url="https://data.mendeley.com/datasets/74jsdxtmx2/3",
        licence="CC-BY-4.0",
        origin="Pune, Maharashtra (field)",
        kind="mendeley_files",
        mendeley_id="74jsdxtmx2",
        files=("Cotton-Original.zip",),
    ),
    Source(
        key="rice_sethy",
        title="Rice Leaf Disease Image Samples (Sethy et al. 2020)",
        url="https://data.mendeley.com/datasets/fwcj7stb8r/2",
        licence="CC-BY-4.0",
        origin="Western Odisha (field)",
        kind="mendeley_files",
        mendeley_id="fwcj7stb8r",
        files=("Rice Leaf Disease Images.7z",),
    ),
    Source(
        key="soybean_multi",
        title="Multi-Class Soybean Leaf Disease Dataset",
        url="https://data.mendeley.com/datasets/6fhphxg297/2",
        licence="CC-BY-4.0",
        origin="not stated (field)",
        kind="mendeley_all",
        mendeley_id="6fhphxg297",
    ),
    Source(
        key="onion_cold",
        title="Onion dataset (COLD)",
        url="https://data.mendeley.com/datasets/7nxxn4gj5s/2",
        licence="CC-BY-4.0",
        origin="India (field)",
        kind="mendeley_files",
        mendeley_id="7nxxn4gj5s",
        files=("resized_onion_raw.rar",),
    ),
    Source(
        key="chilli_krishna",
        title="Chili Leaf Diseases in the Krishna River Basin (original images)",
        url="https://data.mendeley.com/datasets/ymt8k9bjkn/3",
        licence="CC-BY-4.0",
        origin="Karnataka & Andhra Pradesh (field)",
        kind="mendeley_files",
        mendeley_id="ymt8k9bjkn",
        files=("Chili Leaf Disease Original Dataset.zip",),
    ),
    Source(
        key="banana_lsd",
        title="BananaLSD (banana leaf spot diseases)",
        url="https://data.mendeley.com/datasets/9tb7k297ff/1",
        licence="CC-BY-4.0",
        origin="field",
        kind="mendeley_all",
        mendeley_id="9tb7k297ff",
        eval_only=True,
        notes="Unsupported crop: used only as a near-out-of-distribution test (must be rejected).",
    ),
    Source(
        key="plantdoc_test",
        title="PlantDoc classification test split",
        url="https://github.com/pratikkayal/PlantDoc-Dataset",
        licence="Repo CC-BY-4.0; images web-scraped, copyright unknown",
        origin="web / field photos",
        kind="github_tree",
        github_repo="pratikkayal/PlantDoc-Dataset",
        github_path="test",
        eval_only=True,
        notes="Evaluation only (cross-source test for the PlantVillage crops); never trained on.",
    ),
    Source(
        key="imagenette",
        title="Imagenette 160 px (10-class ImageNet subset, fast.ai)",
        url="https://github.com/fastai/imagenette",
        licence="Apache-2.0 (dataset tooling); images are ImageNet images (ImageNet terms, same "
        "ambiguity as the ImageNet-pretrained backbone)",
        origin="web photos (non-plant objects)",
        kind="url",
        download_url="https://s3.amazonaws.com/fast-ai-imageclas/imagenette2-160.tgz",
        notes="Train split: 'not a leaf' negatives. Val split: out-of-distribution test.",
    ),
]

BY_KEY = {s.key: s for s in SOURCES}
