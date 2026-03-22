"""Enhanced sustainability scoring with category-aware prompts and eco-database reconciliation."""

import json
import logging
import os
import google.generativeai as genai
from eco_database import (
    categorize_product,
    lookup_brand,
    get_category_baseline,
    CERTIFICATION_IMPACTS,
)

log = logging.getLogger("wastewise-agent")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# Category-specific scoring factors injected into the prompt
CATEGORY_PROMPTS: dict[str, str] = {
    "beef": "Focus on: methane emissions from cattle, water usage (1800 gal/lb), land use for grazing, grain feed carbon cost, packaging.",
    "lamb": "Focus on: methane emissions, land use, water consumption, transport distance.",
    "pork": "Focus on: feed conversion efficiency, manure management, water usage, antibiotics use.",
    "chicken": "Focus on: feed efficiency (best among meats), water usage, factory farming conditions, packaging.",
    "dairy": "Focus on: methane from cows, water usage, pasteurization energy, packaging (plastic vs glass).",
    "bottled_water": "Focus on: plastic bottle production, transport emissions, recycling rate (<30%), tap water alternative.",
    "organic_produce": "Focus on: reduced pesticide use, soil health benefits, potentially higher transport, seasonal availability.",
    "plant_based_protein": "Focus on: much lower emissions than meat, processing energy, soy/pea sourcing, packaging.",
    "disposable_plastics": "Focus on: single-use waste, ocean pollution, microplastics, decomposition time (400+ years).",
    "electronics_new": "Focus on: rare earth mineral mining, factory energy use, planned obsolescence, e-waste, repairability.",
    "fast_fashion": "Focus on: water pollution from dyeing, microplastic shedding, textile waste, labor conditions, garment lifespan.",
    "cleaning_conventional": "Focus on: chemical runoff, aquatic toxicity, plastic packaging, VOC emissions.",
    "cleaning_eco": "Focus on: plant-based ingredients, biodegradability, concentrated formulas, refillable packaging.",
    "paper_products": "Focus on: deforestation vs recycled content, bleaching chemicals, single-use nature, composability.",
    "batteries_disposable": "Focus on: toxic heavy metals, landfill leaching, short lifespan, recycling difficulty.",
    "batteries_rechargeable": "Focus on: lithium/cobalt mining, longer lifespan offsets, proper disposal requirements.",
}


def _configure_genai():
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)


def _build_prompt(
    products: list[dict],
    categories: list[str | None],
    brand_data: list[dict | None],
    retailer: str | None,
) -> str:
    """Build a category-aware prompt with eco-database context."""
    product_entries = []
    for i, p in enumerate(products):
        entry = {
            "index": i,
            "name": p["name"],
            "brand": p.get("brand") or "Unknown",
        }

        cat = categories[i]
        if cat:
            entry["detected_category"] = cat
            baseline = get_category_baseline(cat)
            if baseline:
                entry["category_baseline_score"] = baseline["baseline_score"]
                entry["category_note"] = baseline["reason"]

        bd = brand_data[i]
        if bd:
            entry["known_brand_score"] = bd["base_score"]
            entry["certifications"] = bd["certifications"]

        product_entries.append(entry)

    # Gather unique category-specific instructions
    cat_instructions = []
    seen_cats = set()
    for cat in categories:
        if cat and cat not in seen_cats and cat in CATEGORY_PROMPTS:
            seen_cats.add(cat)
            cat_instructions.append(f"- For {cat} products: {CATEGORY_PROMPTS[cat]}")

    cat_block = "\n".join(cat_instructions) if cat_instructions else ""

    prompt = f"""You are a sustainability expert with access to verified eco-certification databases. Rate the environmental sustainability of these products on a scale of 0 to 100.

IMPORTANT: Some products include pre-verified data from our eco-database (known_brand_score, certifications, category_baseline_score). Use these as anchors — your score should be within ±15 points of any provided baseline unless you have strong reason to diverge.

General scoring factors:
- Carbon footprint of production and transport
- Packaging waste and recyclability
- Whether the product is reusable vs disposable
- Ingredient sourcing and farming practices
- Brand sustainability commitments and certifications
- Product lifecycle and end-of-life impact

{f"Category-specific guidance:{chr(10)}{cat_block}" if cat_block else ""}

For each product, suggest 1-2 more sustainable alternatives that a shopper could find{f" at {retailer}" if retailer else " at major retailers"}.

Products to rate:
{json.dumps(product_entries, indent=2)}

Respond with ONLY a JSON array (no markdown, no backticks) in this exact format:
[
  {{
    "score": <number 0-100>,
    "explanation": "<1-2 sentence explanation citing specific factors>",
    "confidence": "<high|medium|low>",
    "data_sources": ["<what informed this score: eco-database, category-baseline, brand-certifications, general-knowledge>"],
    "factors": [
      {{ "label": "<short label>", "impact": <positive or negative number>, "detail": "<brief detail>" }}
    ],
    "alternatives": [
      {{ "name": "<real product name>", "reason": "<why it's more sustainable>" }}
    ]
  }}
]"""
    return prompt


async def score_products(
    products: list[dict], retailer: str | None = None
) -> list[dict]:
    """Score products using category-aware Gemini + eco-database reconciliation."""
    _configure_genai()

    # Step 1: Categorize and look up eco-database
    categories = [categorize_product(p["name"], p.get("brand")) for p in products]
    brand_data = [lookup_brand(p.get("brand")) for p in products]

    for i, p in enumerate(products):
        log.info(
            "  Product %d: %s | category=%s | brand_match=%s",
            i, p["name"], categories[i] or "unknown", bool(brand_data[i]),
        )

    # Step 2: Build enhanced prompt
    prompt = _build_prompt(products, categories, brand_data, retailer)
    log.info("Calling Gemini (gemini-2.5-flash) with %d-char prompt", len(prompt))

    # Step 3: Call Gemini
    model = genai.GenerativeModel("gemini-2.5-flash")
    response = await model.generate_content_async(
        prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )

    log.info("Gemini response received (%d chars)", len(response.text))
    raw_scores = json.loads(response.text)

    # Step 4: Reconcile with eco-database
    final_scores = []
    for i, score_data in enumerate(raw_scores):
        raw = score_data.get("score", "?")
        score_data = _reconcile_score(score_data, categories[i], brand_data[i])
        score_data["score"] = max(5, min(98, round(score_data["score"])))
        if raw != score_data["score"]:
            log.info("  Product %d: Gemini=%s → reconciled=%d", i, raw, score_data["score"])
        final_scores.append(score_data)

    return final_scores


def _reconcile_score(
    score_data: dict, category: str | None, brand_info: dict | None
) -> dict:
    """Cross-reference Gemini's score against eco-database and adjust if needed."""
    gemini_score = score_data.get("score", 50)
    sources = score_data.get("data_sources", [])

    # If we have a known brand score, anchor toward it
    if brand_info:
        brand_score = brand_info["base_score"]
        # Weighted blend: 60% Gemini, 40% eco-database
        blended = gemini_score * 0.6 + brand_score * 0.4
        if abs(gemini_score - brand_score) > 20:
            score_data["score"] = round(blended)
            if "eco-database" not in sources:
                sources.append("eco-database")
            # Add certification factors if missing
            for cert in brand_info.get("certifications", []):
                impact = CERTIFICATION_IMPACTS.get(cert, 5)
                already_listed = any(
                    cert.lower() in f.get("label", "").lower()
                    for f in score_data.get("factors", [])
                )
                if not already_listed:
                    score_data.setdefault("factors", []).append(
                        {"label": cert, "impact": impact, "detail": f"Verified {cert} certification"}
                    )

    # If we have a category baseline, nudge toward it
    if category:
        baseline = get_category_baseline(category)
        if baseline:
            baseline_score = baseline["baseline_score"]
            # If Gemini is way off from category baseline, nudge
            if abs(gemini_score - baseline_score) > 25:
                nudged = gemini_score * 0.7 + baseline_score * 0.3
                score_data["score"] = round(nudged)
                if "category-baseline" not in sources:
                    sources.append("category-baseline")

    score_data["data_sources"] = sources
    return score_data
