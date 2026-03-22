import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  calculateReceipt,
  getTotalCarbon,
  getHighestImpactItem,
  generateSuggestions,
} from "@/lib/carbon";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function extractItemsFromImage(
  imageDataUrl: string
): Promise<{ name: string; quantity: number }[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: 'You are a receipt scanner. Extract all food/grocery items from this receipt image. Return ONLY a JSON array of objects with "name" (lowercase, simple food name like "beef", "milk", "bread") and "quantity" (number). Example: [{"name":"beef","quantity":1},{"name":"milk","quantity":2}]. If you cannot read the receipt or find no food items, return an empty array []. Return ONLY the JSON array, no other text.',
          },
          {
            type: "image_url",
            image_url: { url: imageDataUrl },
          },
        ],
      },
    ],
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content?.trim() ?? "[]";
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(
      (item: { name?: string; quantity?: number }) =>
        item.name && typeof item.name === "string"
    )
    .map((item: { name: string; quantity?: number }) => ({
      name: item.name.toLowerCase().trim(),
      quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
    }));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, image } = body as {
      items?: { name: string; quantity: number }[];
      image?: string;
    };

    if (image && typeof image === "string") {
      const extracted = await extractItemsFromImage(image);
      if (extracted.length === 0) {
        return NextResponse.json(
          { error: "Could not read any food items from the receipt. Try a clearer photo or enter items manually." },
          { status: 400 }
        );
      }
      const receiptItems = calculateReceipt(extracted);
      const totalCarbon = getTotalCarbon(receiptItems);
      const highestImpact = getHighestImpactItem(receiptItems);
      const suggestions = generateSuggestions(receiptItems);

      return NextResponse.json({
        id: crypto.randomUUID(),
        items: receiptItems,
        total_carbon_kg: totalCarbon,
        highest_impact_item: highestImpact,
        suggestions,
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Please provide an array of items with name and quantity" },
        { status: 400 }
      );
    }

    const receiptItems = calculateReceipt(items);
    const totalCarbon = getTotalCarbon(receiptItems);
    const highestImpact = getHighestImpactItem(receiptItems);
    const suggestions = generateSuggestions(receiptItems);

    return NextResponse.json({
      id: crypto.randomUUID(),
      items: receiptItems,
      total_carbon_kg: totalCarbon,
      highest_impact_item: highestImpact,
      suggestions,
    });
  } catch (err) {
    console.error("Receipt scan error:", err);
    return NextResponse.json(
      { error: "Failed to process receipt" },
      { status: 500 }
    );
  }
}
