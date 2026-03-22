import { NextRequest, NextResponse } from "next/server";

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
    const { description } = body as { description?: string };

    // Simulate processing time for demo effect
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock classification based on description keywords
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
  } catch {
    return NextResponse.json(
      { error: "Failed to classify waste" },
      { status: 500 }
    );
  }
}
