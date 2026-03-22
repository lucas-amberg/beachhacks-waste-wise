import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const WASTE_CLASSIFICATION_PROMPT = `You are an expert waste classification assistant. Analyze this image of a waste item and classify it into one of three categories: "recycle", "compost", or "landfill".

Return ONLY a JSON object with these fields:
- "category": one of "recycle", "compost", or "landfill"
- "confidence": a number between 0.0 and 1.0 representing your confidence
- "instructions": a concise 1-2 sentence disposal instruction for this specific item

Examples:
{"category":"recycle","confidence":0.92,"instructions":"Rinse the bottle and replace the cap before placing in your recycling bin. Most curbside programs accept #1 PET bottles."}
{"category":"compost","confidence":0.88,"instructions":"Place banana peels in your compost bin. They break down quickly and add potassium to the soil."}
{"category":"landfill","confidence":0.85,"instructions":"Styrofoam cannot be recycled in most areas. Place in general waste and consider reusable containers next time."}`;

async function classifyWasteImage(
  imageDataUrl: string
): Promise<{ category: "recycle" | "compost" | "landfill"; confidence: number; instructions: string } | null> {
  const match = imageDataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;
  const [, mimeType, base64Data] = match;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: WASTE_CLASSIFICATION_PROMPT },
          { inlineData: { mimeType, data: base64Data } },
        ],
      },
    ],
    config: {
      maxOutputTokens: 500,
    },
  });

  const content = response.text?.trim() ?? "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const category = ["recycle", "compost", "landfill"].includes(parsed.category)
      ? parsed.category
      : "landfill";
    return {
      category,
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.8)),
      instructions: typeof parsed.instructions === "string" ? parsed.instructions : "Place in general waste when unsure.",
    };
  } catch {
    return null;
  }
}

const WASTE_CATEGORIES: Record<
  string,
  { category: "recycle" | "compost" | "landfill"; instructions: string }
> = {
  plastic: {
    category: "recycle",
    instructions:
      "Rinse and place in your recycling bin. Remove caps and labels if possible. Check the number inside the recycling triangle — #1 (PET) and #2 (HDPE) are widely accepted.",
  },
  bottle: {
    category: "recycle",
    instructions:
      "Empty and rinse the bottle. Replace the cap before recycling. Most curbside programs accept plastic bottles.",
  },
  paper: {
    category: "recycle",
    instructions:
      "Flatten cardboard and place in recycling. Keep paper dry and clean. Remove any tape or stickers if possible.",
  },
  cardboard: {
    category: "recycle",
    instructions:
      "Break down cardboard boxes flat. Remove any packing materials like bubble wrap or styrofoam. Place in your recycling bin.",
  },
  glass: {
    category: "recycle",
    instructions:
      "Rinse glass containers and place in recycling. Remove metal lids. Note: broken glass, mirrors, and ceramics should go in the trash.",
  },
  aluminum: {
    category: "recycle",
    instructions:
      "Rinse aluminum cans and place in recycling. Aluminum is infinitely recyclable — a recycled can could be back on the shelf in 60 days!",
  },
  metal: {
    category: "recycle",
    instructions:
      "Rinse metal cans and place in recycling. Aluminum foil can be recycled if clean — ball it up to a golf-ball size.",
  },
  can: {
    category: "recycle",
    instructions:
      "Rinse the can and place in recycling. No need to remove labels. Aluminum cans save 95% of the energy needed to make new aluminum.",
  },
  food: {
    category: "compost",
    instructions:
      "Place in compost bin. Fruit and vegetable scraps, coffee grounds, and eggshells are great for composting. Avoid meat and dairy in home compost.",
  },
  vegetable: {
    category: "compost",
    instructions:
      "Vegetable scraps and peels are perfect for composting! They break down quickly and add nutrients to soil.",
  },
  organic: {
    category: "compost",
    instructions:
      "Compostable! Add to your compost bin or municipal green waste. This will break down into nutrient-rich soil.",
  },
  styrofoam: {
    category: "landfill",
    instructions:
      "Styrofoam (EPS) cannot be recycled in most areas. Place in trash. Consider bringing reusable containers for takeout next time.",
  },
  mixed: {
    category: "landfill",
    instructions:
      "Mixed materials are difficult to recycle. Place in general waste. When possible, try to separate materials before disposal.",
  },
  chip: {
    category: "landfill",
    instructions:
      "Chip bags are usually made of mixed plastic and metal — they cannot be recycled curbside. Place in trash.",
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, image } = body as { description?: string; image?: string };

    // Image-based classification via Gemini
    if (image && typeof image === "string") {
      const result = await classifyWasteImage(image);
      if (!result) {
        return NextResponse.json(
          { error: "Could not classify the waste item from this image. Try a clearer photo or describe the item instead." },
          { status: 400 }
        );
      }
      return NextResponse.json({
        id: crypto.randomUUID(),
        category: result.category,
        confidence: parseFloat(result.confidence.toFixed(2)),
        instructions: result.instructions,
      });
    }

    // Text-based fallback using keyword matching
    await new Promise((resolve) => setTimeout(resolve, 1500));

    let category: "recycle" | "compost" | "landfill" = "landfill";
    let confidence = 0.72;
    let instructions =
      "When in doubt, place in general waste to avoid contaminating recycling streams.";

    if (description) {
      const lower = description.toLowerCase();
      for (const [keyword, data] of Object.entries(WASTE_CATEGORIES)) {
        if (lower.includes(keyword)) {
          category = data.category;
          confidence = 0.85 + Math.random() * 0.12;
          instructions = data.instructions;
          break;
        }
      }
    }

    return NextResponse.json({
      id: crypto.randomUUID(),
      category,
      confidence: parseFloat(confidence.toFixed(2)),
      instructions,
    });
  } catch (err) {
    console.error("Waste classification error:", err);
    return NextResponse.json(
      { error: "Failed to classify waste" },
      { status: 500 }
    );
  }
}
