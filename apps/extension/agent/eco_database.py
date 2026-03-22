"""Curated sustainability data for fact-checking and score reconciliation."""

# Known eco-certified brands: brand_name_lower -> { base_score, certifications }
ECO_BRANDS: dict[str, dict] = {
    "seventh generation": {"base_score": 82, "certifications": ["B-Corp", "EPA Safer Choice"]},
    "method": {"base_score": 78, "certifications": ["B-Corp", "Cradle to Cradle"]},
    "dr. bronner's": {"base_score": 85, "certifications": ["Fair Trade", "USDA Organic"]},
    "ecover": {"base_score": 76, "certifications": ["B-Corp"]},
    "mrs. meyer's": {"base_score": 72, "certifications": ["Leaping Bunny"]},
    "blueland": {"base_score": 84, "certifications": ["Climate Neutral", "Plastic-Free"]},
    "grove collaborative": {"base_score": 75, "certifications": ["B-Corp", "Plastic Neutral"]},
    "ethique": {"base_score": 88, "certifications": ["B-Corp", "Plastic-Free", "Carbon Neutral"]},
    "patagonia": {"base_score": 88, "certifications": ["B-Corp", "Fair Trade", "1% for the Planet"]},
    "allbirds": {"base_score": 80, "certifications": ["B-Corp", "Carbon Neutral"]},
    "tentree": {"base_score": 78, "certifications": ["B-Corp", "Climate Neutral"]},
    "pact": {"base_score": 76, "certifications": ["Fair Trade", "GOTS Organic"]},
    "who gives a crap": {"base_score": 82, "certifications": ["B-Corp", "FSC"]},
    "earth breeze": {"base_score": 80, "certifications": ["Plastic-Free", "Carbon Neutral"]},
    "stasher": {"base_score": 78, "certifications": ["B-Corp", "Plastic-Free"]},
    "hydro flask": {"base_score": 72, "certifications": ["Parks for All"]},
    "klean kanteen": {"base_score": 76, "certifications": ["B-Corp", "1% for the Planet"]},
    "burt's bees": {"base_score": 70, "certifications": ["Natural Products Assoc"]},
    "tom's of maine": {"base_score": 68, "certifications": ["B-Corp", "Leaping Bunny"]},
    "by humankind": {"base_score": 80, "certifications": ["Plastic Neutral", "Climate Neutral"]},
    "public goods": {"base_score": 74, "certifications": ["Climate Neutral"]},
    "dropps": {"base_score": 80, "certifications": ["B-Corp", "Plastic-Free"]},
    "native": {"base_score": 65, "certifications": ["Leaping Bunny"]},
    "counter culture coffee": {"base_score": 78, "certifications": ["B-Corp", "Fair Trade"]},
    "equal exchange": {"base_score": 82, "certifications": ["Fair Trade", "B-Corp", "USDA Organic"]},
    "bite": {"base_score": 82, "certifications": ["Plastic-Free", "Carbon Neutral"]},
    "leaf shave": {"base_score": 78, "certifications": ["Plastic-Free"]},
    "plaine products": {"base_score": 80, "certifications": ["Plastic-Free", "B-Corp"]},
    "meow meow tweet": {"base_score": 82, "certifications": ["Plastic-Free", "Vegan"]},
    "package free": {"base_score": 84, "certifications": ["Zero Waste", "B-Corp"]},
    "hippeas": {"base_score": 68, "certifications": ["Non-GMO", "USDA Organic"]},
    "lesser evil": {"base_score": 66, "certifications": ["USDA Organic", "Non-GMO"]},
    "branch basics": {"base_score": 78, "certifications": ["EWG Verified"]},
    "pipette": {"base_score": 70, "certifications": ["EWG Verified"]},
    "eco by naty": {"base_score": 80, "certifications": ["OK Biobased", "FSC"]},
    "hibar": {"base_score": 78, "certifications": ["Plastic-Free"]},
    "imperfect foods": {"base_score": 74, "certifications": ["Food Waste Reduction"]},
    "misfits market": {"base_score": 74, "certifications": ["Food Waste Reduction"]},
    "thrive market": {"base_score": 72, "certifications": ["B-Corp", "Zero Waste Warehouse"]},
    "simple truth organic": {"base_score": 68, "certifications": ["USDA Organic"]},
    "365 by whole foods": {"base_score": 66, "certifications": ["USDA Organic"]},
}

# Product category baselines: category -> { baseline_score, reason }
CATEGORY_BASELINES: dict[str, dict] = {
    "beef": {"baseline_score": 20, "reason": "High methane emissions, water usage, and land use"},
    "lamb": {"baseline_score": 22, "reason": "High methane emissions and resource-intensive farming"},
    "pork": {"baseline_score": 35, "reason": "Moderate emissions, water and feed requirements"},
    "chicken": {"baseline_score": 45, "reason": "Lower emissions than red meat but still resource-intensive"},
    "fish_wild": {"baseline_score": 50, "reason": "Variable impact depending on fishing practices"},
    "fish_farmed": {"baseline_score": 40, "reason": "Water pollution and feed sustainability concerns"},
    "dairy": {"baseline_score": 35, "reason": "Methane emissions and water usage from dairy farming"},
    "eggs": {"baseline_score": 48, "reason": "Moderate emissions, better than most animal products"},
    "bottled_water": {"baseline_score": 25, "reason": "Plastic waste, unnecessary transport emissions"},
    "soda": {"baseline_score": 30, "reason": "Aluminum/plastic packaging, sugar crop impact"},
    "organic_produce": {"baseline_score": 78, "reason": "Reduced pesticide use, better soil health"},
    "conventional_produce": {"baseline_score": 58, "reason": "Pesticide use but lower transport than imported"},
    "plant_based_protein": {"baseline_score": 72, "reason": "Much lower emissions than animal protein"},
    "disposable_plastics": {"baseline_score": 15, "reason": "Single-use plastics, landfill and ocean pollution"},
    "reusable_containers": {"baseline_score": 82, "reason": "Reduces single-use waste over lifetime"},
    "electronics_new": {"baseline_score": 35, "reason": "Rare earth mining, energy-intensive production, e-waste"},
    "electronics_refurbished": {"baseline_score": 70, "reason": "Extends product lifecycle, reduces e-waste"},
    "fast_fashion": {"baseline_score": 20, "reason": "Water pollution, textile waste, exploitative labor"},
    "sustainable_clothing": {"baseline_score": 72, "reason": "Organic materials, fair labor, durable design"},
    "cleaning_conventional": {"baseline_score": 40, "reason": "Chemical runoff, plastic packaging"},
    "cleaning_eco": {"baseline_score": 75, "reason": "Plant-based ingredients, recyclable packaging"},
    "paper_products": {"baseline_score": 35, "reason": "Deforestation risk, single-use waste"},
    "batteries_disposable": {"baseline_score": 20, "reason": "Toxic materials, landfill pollution"},
    "batteries_rechargeable": {"baseline_score": 65, "reason": "Reusable but contains lithium/cobalt"},
}

# Certification score impacts
CERTIFICATION_IMPACTS: dict[str, int] = {
    "USDA Organic": 12,
    "Fair Trade": 10,
    "B-Corp": 8,
    "FSC": 8,
    "Energy Star": 10,
    "Cradle to Cradle": 12,
    "Carbon Neutral": 10,
    "Climate Neutral": 10,
    "Plastic-Free": 8,
    "Leaping Bunny": 5,
    "Rainforest Alliance": 8,
    "Non-GMO": 4,
    "EWG Verified": 6,
    "GOTS Organic": 10,
    "1% for the Planet": 6,
    "EPA Safer Choice": 8,
    "OK Biobased": 6,
    "Plastic Neutral": 5,
    "Zero Waste": 10,
    "Vegan": 4,
}

# Keywords for auto-categorization
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "beef": ["beef", "steak", "ground beef", "brisket", "sirloin", "ribeye", "angus"],
    "lamb": ["lamb", "lamb chops"],
    "pork": ["pork", "bacon", "ham", "sausage", "pork chops"],
    "chicken": ["chicken", "turkey", "poultry", "chicken breast"],
    "dairy": ["milk", "cheese", "yogurt", "butter", "cream", "ice cream"],
    "eggs": ["eggs", "egg"],
    "bottled_water": ["water bottle", "spring water", "purified water", "water pack", "water case"],
    "soda": ["coca-cola", "pepsi", "sprite", "soda", "cola", "dr pepper", "mountain dew"],
    "organic_produce": ["organic"],
    "plant_based_protein": ["beyond meat", "impossible", "tofu", "tempeh", "plant-based", "vegan protein"],
    "disposable_plastics": ["plastic wrap", "plastic bag", "disposable", "single-use", "paper plate", "paper cup", "styrofoam", "k-cup"],
    "reusable_containers": ["reusable", "stainless steel bottle", "glass container", "beeswax wrap"],
    "electronics_new": ["laptop", "phone", "tablet", "tv", "computer", "airpods", "headphones"],
    "fast_fashion": ["shein", "forever 21", "fashion nova", "zaful", "romwe"],
    "cleaning_conventional": ["tide", "clorox", "lysol", "windex", "ajax", "dawn"],
    "cleaning_eco": ["seventh generation", "method", "ecover", "blueland", "branch basics", "dropps"],
    "paper_products": ["paper towel", "napkin", "tissue", "toilet paper"],
    "batteries_disposable": ["alkaline batter", "duracell", "energizer"],
    "batteries_rechargeable": ["rechargeable", "eneloop"],
}


def categorize_product(name: str, brand: str | None = None) -> str | None:
    """Auto-categorize a product based on name/brand keywords."""
    text = f"{name} {brand or ''}".lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                return category
    return None


def lookup_brand(brand: str | None) -> dict | None:
    """Look up a brand in the eco-database."""
    if not brand:
        return None
    return ECO_BRANDS.get(brand.lower().strip())


def get_category_baseline(category: str | None) -> dict | None:
    """Get the baseline score for a product category."""
    if not category:
        return None
    return CATEGORY_BASELINES.get(category)
