"""WasteWise Sustainability Scoring Agent — FastAPI server with Agentverse Chat Protocol."""

import json
import logging
import os
import time
import uuid
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from scoring import score_products

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("wastewise-agent")

app = FastAPI(title="WasteWise Sustainability Agent", version="1.0.0")

# Allow extension background worker to reach us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


class ProductInput(BaseModel):
    name: str
    brand: str | None = None
    category: str | None = None
    price: float | None = None


class ScoreRequest(BaseModel):
    products: list[ProductInput]
    retailer: str | None = None


class ScoreResult(BaseModel):
    score: int
    explanation: str
    confidence: str = "medium"
    data_sources: list[str] = []
    factors: list[dict] = []
    alternatives: list[dict] = []


class ScoreResponse(BaseModel):
    scores: list[ScoreResult]
    source: str = "agentverse"
    agent_version: str = "1.0.0"


@app.on_event("startup")
async def on_startup():
    log.info("WasteWise Agent v1.0.0 started")
    log.info("Gemini API key: %s", "configured" if os.environ.get("GEMINI_API_KEY") else "NOT SET")


@app.get("/status")
async def status():
    log.info("Health check requested")
    return {
        "status": "ok",
        "agent": "WasteWise Sustainability Agent",
        "version": "1.0.0",
    }


@app.post("/score", response_model=ScoreResponse)
async def score(request: ScoreRequest):
    product_names = [p.name for p in request.products]
    log.info("POST /score — %d product(s): %s", len(request.products), product_names)

    if not request.products:
        raise HTTPException(status_code=400, detail="No products provided")

    if len(request.products) > 30:
        raise HTTPException(status_code=400, detail="Maximum 30 products per request")

    products = [p.model_dump() for p in request.products]

    try:
        start = time.time()
        results = await score_products(products, request.retailer)
        elapsed = time.time() - start

        for i, r in enumerate(results):
            log.info(
                "  [%d] %s → score=%d confidence=%s",
                i, product_names[i], r["score"], r.get("confidence", "?"),
            )
        log.info("Scoring completed in %.2fs", elapsed)

        return ScoreResponse(
            scores=[ScoreResult(**r) for r in results],
            source="agentverse",
            agent_version="1.0.0",
        )
    except Exception as e:
        log.error("Scoring failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ════════════════════════════════════════════
#  AGENTVERSE CHAT PROTOCOL ENDPOINT
# ════════════════════════════════════════════


class ChatMessage(BaseModel):
    """Agentverse Chat Protocol message."""
    msg_id: str = ""
    text: str = ""
    # Accept any extra fields from the protocol
    class Config:
        extra = "allow"


@app.post("/chat")
async def chat(message: ChatMessage):
    """Handle Agentverse Chat Protocol messages.

    Parses product names from the text, scores them, and returns a formatted response.
    Example input: "Score these products: Tide Pods, Seventh Generation Laundry Detergent"
    """
    log.info("POST /chat — msg_id=%s text=%r", message.msg_id, message.text[:120])

    text = message.text.strip()
    if not text:
        log.warning("Chat received empty text")
        return _chat_response("Please send product names to score. Example: 'Score: Tide Pods, Patagonia Jacket'", message.msg_id)

    # Parse product names from text (comma-separated after optional "Score:" prefix)
    cleaned = text
    for prefix in ["score:", "rate:", "analyze:", "check:"]:
        if cleaned.lower().startswith(prefix):
            cleaned = cleaned[len(prefix):]
            break

    product_names = [p.strip() for p in cleaned.split(",") if p.strip()]
    if not product_names:
        log.warning("Chat could not parse product names from: %r", text)
        return _chat_response("I couldn't parse any product names. Send comma-separated product names.", message.msg_id)

    log.info("Chat parsed %d product(s): %s", len(product_names), product_names)
    products = [{"name": name} for name in product_names]

    try:
        start = time.time()
        results = await score_products(products)
        elapsed = time.time() - start
        log.info("Chat scoring completed in %.2fs", elapsed)

        lines = [f"Sustainability Scores for {len(results)} product(s):\n"]
        for i, r in enumerate(results):
            grade = "A" if r["score"] >= 80 else "B" if r["score"] >= 60 else "C" if r["score"] >= 40 else "D" if r["score"] >= 20 else "F"
            lines.append(f"{i+1}. **{product_names[i]}** — {r['score']}/100 (Grade {grade})")
            lines.append(f"   {r['explanation']}")
            if r.get("alternatives"):
                alts = ", ".join(a["name"] for a in r["alternatives"][:2])
                lines.append(f"   Better alternatives: {alts}")
            lines.append("")

        return _chat_response("\n".join(lines), message.msg_id)
    except Exception as e:
        log.error("Chat scoring failed: %s", e, exc_info=True)
        return _chat_response(f"Scoring failed: {str(e)}", message.msg_id)


def _chat_response(text: str, ref_msg_id: str = "") -> dict:
    """Build a Chat Protocol response."""
    return {
        "msg_id": str(uuid.uuid4()),
        "ref_msg_id": ref_msg_id,
        "content": [{"type": "text", "text": text}],
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
