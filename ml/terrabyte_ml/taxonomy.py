"""Canonical classes: ``<crop>__<condition>``, plus one ``other`` class (not a supported leaf).

Every source folder / file prefix is mapped here by hand. Anything unmapped is ignored and
reported by ``prepare``.
"""

from __future__ import annotations

OTHER = "other"

# Crops the farmer can choose in the app, with display names.
CROPS = {
    "tomato": "Tomato",
    "potato": "Potato",
    "capsicum": "Capsicum (bell pepper)",
    "maize": "Maize",
    "grape": "Grape",
    "soybean": "Soybean",
    "cotton": "Cotton",
    "sugarcane": "Sugarcane",
    "rice": "Rice",
    "pigeonpea": "Tur / pigeonpea",
    "chilli": "Chilli",
}

PLANTVILLAGE = {
    "Tomato___Bacterial_spot": "tomato__bacterial_spot",
    "Tomato___Early_blight": "tomato__early_blight",
    "Tomato___Late_blight": "tomato__late_blight",
    "Tomato___Leaf_Mold": "tomato__leaf_mold",
    "Tomato___Septoria_leaf_spot": "tomato__septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite": "tomato__spider_mites",
    "Tomato___Target_Spot": "tomato__target_spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": "tomato__yellow_leaf_curl_virus",
    "Tomato___Tomato_mosaic_virus": "tomato__mosaic_virus",
    "Tomato___healthy": "tomato__healthy",
    "Potato___Early_blight": "potato__early_blight",
    "Potato___Late_blight": "potato__late_blight",
    "Potato___healthy": "potato__healthy",
    "Pepper,_bell___Bacterial_spot": "capsicum__bacterial_spot",
    "Pepper,_bell___healthy": "capsicum__healthy",
    "Corn___Cercospora_leaf_spot Gray_leaf_spot": "maize__gray_leaf_spot",
    "Corn___Common_rust": "maize__common_rust",
    "Corn___Northern_Leaf_Blight": "maize__northern_leaf_blight",
    "Corn___healthy": "maize__healthy",
    "Grape___Black_rot": "grape__black_rot",
    "Grape___Esca_(Black_Measles)": "grape__esca",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)": "grape__leaf_blight",
    "Grape___healthy": "grape__healthy",
    "Soybean___healthy": "soybean__healthy",
}
# PlantVillage crops we do not support, and background-only photos: "other".
PLANTVILLAGE_OTHER_PREFIXES = (
    "Apple___",
    "Blueberry___",
    "Cherry___",
    "Orange___",
    "Peach___",
    "Raspberry___",
    "Squash___",
    "Strawberry___",
    "Background_without_leaves",
)

NGLD = {
    "Bacterial Leaf Spot": "grape__bacterial_leaf_spot",
    "Downy Mildew": "grape__downy_mildew",
    "Healthy Leaves": "grape__healthy",
    "Powdery Mildew": "grape__powdery_mildew",
}

SOYBEAN = {
    "BB": "soybean__bacterial_blight",
    "CLB": "soybean__cercospora_leaf_blight",
    "HEALTHY": "soybean__healthy",
    "RUST": "soybean__rust",
    "SDS": "soybean__sudden_death_syndrome",
}

COTTON_T9 = {
    "Alternaria Leaf Spot": "cotton__alternaria_leaf_spot",
    "Bacterial Blight": "cotton__bacterial_blight",
    "Fusarium Wilt": "cotton__fusarium_wilt",
    "Healthy Leaf": "cotton__healthy",
    "Verticillium Wilt": "cotton__verticillium_wilt",
}

PPLD = {
    "Healthy": "pigeonpea__healthy",
    "Leaf_Spot": "pigeonpea__leaf_spot",
    "Leaf_webber": "pigeonpea__leaf_webber",
    "Sterilic_mosaic": "pigeonpea__sterility_mosaic",
}

CHILLI = {
    "Bacterial Spot": "chilli__bacterial_spot",
    "Cercospora Leaf Spot": "chilli__cercospora_leaf_spot",
    "Curl Virus": "chilli__leaf_curl_virus",
    "Healthy Leaf": "chilli__healthy",
    "Nutrition Deficiency": "chilli__nutrient_deficiency",
    "White spot": "chilli__white_spot",
}

# Cross-source test only (classes that match our training classes).
SUGARCANE_12 = {
    "BrownRust": "sugarcane__rust",
    "Yellow Leaf": "sugarcane__yellow_leaf",
    "Healthy Leaves": "sugarcane__healthy",
}

PLANTDOC = {
    "Tomato leaf bacterial spot": "tomato__bacterial_spot",
    "Tomato Early blight leaf": "tomato__early_blight",
    "Tomato leaf late blight": "tomato__late_blight",
    "Tomato mold leaf": "tomato__leaf_mold",
    "Tomato Septoria leaf spot": "tomato__septoria_leaf_spot",
    "Tomato two spotted spider mites leaf": "tomato__spider_mites",
    "Tomato leaf yellow virus": "tomato__yellow_leaf_curl_virus",
    "Tomato leaf mosaic virus": "tomato__mosaic_virus",
    "Tomato leaf": "tomato__healthy",
    "Potato leaf early blight": "potato__early_blight",
    "Potato leaf late blight": "potato__late_blight",
    "Bell_pepper leaf spot": "capsicum__bacterial_spot",
    "Bell_pepper leaf": "capsicum__healthy",
    "Corn Gray leaf spot": "maize__gray_leaf_spot",
    "Corn rust leaf": "maize__common_rust",
    "Corn leaf blight": "maize__northern_leaf_blight",
    "grape leaf black rot": "grape__black_rot",
    "grape leaf": "grape__healthy",
    "Soyabean leaf": "soybean__healthy",
}
# PlantDoc folders of crops we do not support: an out-of-distribution test (field photos).
PLANTDOC_OOD = (
    "Apple leaf",
    "Apple rust leaf",
    "Apple Scab Leaf",
    "Blueberry leaf",
    "Cherry leaf",
    "Peach leaf",
    "Raspberry leaf",
    "Squash Powdery mildew leaf",
    "Strawberry leaf",
)


SUGARCANE_MH = {
    "Healthy": "sugarcane__healthy",
    "Mosaic": "sugarcane__mosaic",
    "RedRot": "sugarcane__red_rot",
    "Rust": "sugarcane__rust",
    "Yellow": "sugarcane__yellow_leaf",
}

# Folder names checked after extraction (see prepare's "folder not found" messages).
RICE_SETHY = {
    "Bacterialblight": "rice__bacterial_blight",
    "Blast": "rice__blast",
    "Brownspot": "rice__brown_spot",
    "Tungro": "rice__tungro",
}

# Cross-source test only: cotton from Pune (curl virus is not a training class, so left out).
COTTON_PUNE = {
    "bacterial blight": "cotton__bacterial_blight",
    "fussarium wilt": "cotton__fusarium_wilt",
    "healthy": "cotton__healthy",
}


def crop_of(label: str) -> str | None:
    return None if label == OTHER else label.split("__", 1)[0]


def condition_of(label: str) -> str:
    return label.split("__", 1)[1] if "__" in label else label
