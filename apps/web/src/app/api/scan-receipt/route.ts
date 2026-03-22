import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  estimateCarbon,
  calculateReceipt,
  getTotalCarbon,
  getHighestImpactItem,
  generateSuggestions,
} from "@/lib/carbon";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const RECEIPT_EXTRACTION_PROMPT = `You are an expert grocery receipt scanner. Extract EVERY purchased item from this receipt image. Do NOT skip any items.

IMPORTANT RULES:
1. Extract ALL line items — including snacks, chips, cereals, beverages, sauces, condiments, and packaged goods. Every product the customer bought must appear.
2. Grocery receipts use abbreviations. Common ones: WFM/365WFM = Whole Foods brand, OG = Organic, VDK = Vodka, PLLW = Pillow (cereal), PSTR = Pasture-raised, CHK = Chuck, CHED = Cheddar, SHRM = Mushroom, WHT = White, SLCD = Sliced, SC = Sauce, MK/MX = Milk, CO = Cookie/Cocoa. Decode these into readable product names.
3. For "name": use a descriptive lowercase name that identifies the actual product (e.g. "berry crisp cereal", "habanero lime chips", "vodka pasta sauce", "reduced fat milk", "beef chuck stew meat", "shredded cheddar jack cheese", "almond tortillas", "cassava tortillas"). Do NOT over-simplify to single generic words.
4. For "quantity": use 1 unless the receipt explicitly shows a multi-pack or multiple units.
5. For "weight_info": if the receipt shows a weight for the item (e.g. "1.99 lb", "0.85 lb", "0.54 lb"), include it as a string. Omit this field if no weight is printed.
6. Treat each distinct product as a separate item, even if they are similar (e.g. "almond tortillas" and "cassava tortillas" are two separate items).

Return ONLY a JSON array. Example:
[{"name":"reduced fat milk","quantity":1},{"name":"beef chuck stew meat","quantity":1,"weight_info":"1.99 lb"},{"name":"salmon fillet","quantity":1,"weight_info":"0.85 lb"},{"name":"potato chips","quantity":1}]

If you cannot read the receipt, return [].`;

async function extractItemsFromImage(
  imageDataUrl: string
): Promise<{ name: string; quantity: number; weight_info?: string }[]> {
  // Parse the data URL to extract mimeType and base64 data
  const match = imageDataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return [];
  const [, mimeType, base64Data] = match;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: RECEIPT_EXTRACTION_PROMPT },
          { inlineData: { mimeType, data: base64Data } },
        ],
      },
    ],
    config: {
      maxOutputTokens: 2000,
    },
  });

  const content = response.text?.trim() ?? "[]";
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
    .map((item: { name: string; quantity?: number; weight_info?: string }) => ({
      name: item.name.toLowerCase().trim(),
      quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
      ...(item.weight_info ? { weight_info: item.weight_info } : {}),
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
      let receiptItems;
      try {
        receiptItems = await estimateCarbon(extracted);
      } catch (e) {
        console.warn("LLM carbon estimation failed, using static fallback:", e);
        receiptItems = calculateReceipt(extracted);
      }
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

    let receiptItems;
    try {
      receiptItems = await estimateCarbon(items);
    } catch (e) {
      console.warn("LLM carbon estimation failed, using static fallback:", e);
      receiptItems = calculateReceipt(items);
    }
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
