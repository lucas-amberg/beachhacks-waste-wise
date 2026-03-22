import { NextRequest, NextResponse } from "next/server";

const COST_PER_KG = 0.1;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { carbon_kg } = body as { carbon_kg: number };

    if (!carbon_kg || carbon_kg <= 0) {
      return NextResponse.json(
        { error: "Please provide a valid carbon_kg value" },
        { status: 400 }
      );
    }

    const cost = parseFloat((carbon_kg * COST_PER_KG).toFixed(2));

    return NextResponse.json({
      carbon_offset_kg: carbon_kg,
      cost_usd: cost,
      success: true,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to process offset" },
      { status: 500 }
    );
  }
}
