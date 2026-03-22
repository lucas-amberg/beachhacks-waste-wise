import { ReceiptItem } from "./types";
import { GoogleGenAI } from "@google/genai";

// ---------------------------------------------------------------------------
// LLM-based carbon estimation (Gemini 2.5 Flash)
// ---------------------------------------------------------------------------

const CARBON_ESTIMATION_PROMPT = `You are a carbon footprint estimation engine for grocery items.

REFERENCE CO2e VALUES (kg CO2e per kg of product, from Poore & Nemecek 2018 / Our World in Data):
Beef: 27, Lamb/Mutton: 24, Chocolate: 19, Coffee: 16.5, Shrimp/Prawns: 12, Cheese: 13.5, Butter: 11.9, Pizza: 8, Pork: 7.6, Chicken/Poultry: 6.9, Turkey: 5.5, Fish (average): 5.4, Salmon: 5.4, Tuna: 5.4, Eggs: 4.8, Rice: 4.0, Yogurt: 3.0, Milk: 3.2, Tofu: 3.0, Soda/Soft drinks: 2.5, Pasta/Noodles: 1.8, Chips/Crisps: 1.5, Juice: 1.5, Bread: 1.4, Tomato: 1.4, Cream: 3.8, Ice cream: 4.5, Sausage/Hot dog: 7.6, Bacon: 7.6, Ham: 7.6, Wine: 1.8, Beer: 1.2, Cereal: 1.2, Flour: 1.1, Sugar: 1.2, Oil (cooking): 3.5, Apple: 1.1, Orange: 1.1, Banana: 0.7, Berries: 1.5, Grapes: 1.5, Lettuce/Salad: 0.9, Cucumber: 0.7, Carrot: 0.4, Onion: 0.5, Potato: 0.5, Mushroom: 1.0, Broccoli: 0.9, Pepper: 1.0, Corn: 1.0, Beans/Lentils: 0.9, Nuts: 0.3, Peanut butter: 2.5, Tea: 1.0, Water (bottled): 0.3, Tortilla: 1.5, Pasta sauce: 1.6, Ketchup/Condiments: 1.5, Coconut milk: 1.2, Almond milk: 0.7, Oat milk: 0.9, Soy milk: 1.0, Tofu: 3.0, Avocado: 2.5.

TYPICAL RETAIL PACKAGE WEIGHTS:
Milk: 1 gallon = 3.8 kg. Beef/Pork/Chicken/Lamb (fresh cuts): ~0.45 kg (1 lb). Ground meat: 0.45 kg. Sausages: 0.4 kg. Bacon: 0.34 kg. Cheese (block/shredded): 0.23 kg (8 oz). Eggs: 1 dozen = 0.72 kg. Bread: 1 loaf = 0.5 kg. Rice: 0.9 kg (2 lb bag). Pasta: 0.45 kg (1 lb). Butter: 0.23 kg (0.5 lb). Yogurt: 0.17 kg (6 oz cup). Cream: 0.24 kg (8 fl oz). Ice cream: 0.95 kg (1 pint). Coffee (ground/beans): 0.34 kg (12 oz). Tea: 0.1 kg (box). Banana: 1 bunch = 1.0 kg. Apple: 1 bag = 1.4 kg (3 lb). Orange: 1 bag = 1.8 kg (4 lb). Lettuce: 1 head = 0.3 kg. Tomato: 0.45 kg (1 lb). Potato: 2.3 kg (5 lb bag). Onion: 1.4 kg (3 lb bag). Cucumber: 0.3 kg (1 cucumber). Carrot: 0.9 kg (2 lb bag). Mushroom: 0.23 kg (8 oz). Chips: 0.28 kg (10 oz). Soda: 0.35 kg (12 oz can). Juice: 1.9 kg (64 oz). Chocolate: 0.1 kg (bar). Pizza (frozen): 0.5 kg. Shrimp: 0.34 kg (12 oz). Fish fillet: 0.34 kg. Salmon fillet: 0.34 kg. Tofu: 0.4 kg (14 oz). Tortilla: 0.3 kg (pack). Pasta sauce: 0.68 kg (24 oz jar). Cereal: 0.4 kg (14 oz box). Peanut butter: 0.45 kg (16 oz). Nuts: 0.23 kg (8 oz). Wine: 0.75 kg (bottle). Beer: 2.1 kg (6-pack). Sugar: 1.8 kg (4 lb). Flour: 2.3 kg (5 lb). Oil: 0.45 kg (16 oz). Avocado: 0.2 kg (1 avocado).

INSTRUCTIONS:
For each grocery item provided:
1. Identify the base food product (e.g. "ribeye steak" → beef, "cheddar" → cheese, "ground turkey" → turkey, "vodka pasta sauce" → pasta sauce, "berry crisp cereal" → cereal, "habanero lime chips" → chips).
2. If the item includes a "weight_info" field (e.g. "1.99 lb", "0.85 lb"), convert that to kg (1 lb = 0.4536 kg) and use it as the product weight. This is the ACTUAL weight from the receipt and takes priority over typical package weights.
3. If no weight_info is provided but the item name contains a weight (e.g. "beef 500g", "milk 2L"), use that as the package weight.
4. Otherwise, use the typical retail package weight from the reference above.
5. Calculate: estimated_carbon_kg = co2e_per_kg × weight_kg × quantity. Round to 2 decimal places.
6. Assign a category from EXACTLY these options: "Meat", "Dairy", "Eggs", "Beverages", "Grains", "Fruits & Vegetables", "Snacks", "Other".

Return a JSON object with a single key "items" containing an array of objects, each with:
- "name": the original item name (unchanged)
- "category": one of the valid categories
- "estimated_carbon_kg": the calculated value (number, 2 decimal places)
- "quantity": the original quantity (number)`;

export async function estimateCarbon(
  items: { name: string; quantity: number; weight_info?: string }[]
): Promise<ReceiptItem[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const userMessage = JSON.stringify(
    items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      ...(i.weight_info ? { weight_info: i.weight_info } : {}),
    }))
  );

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userMessage,
    config: {
      systemInstruction: CARBON_ESTIMATION_PROMPT,
      responseMimeType: "application/json",
      temperature: 0,
      maxOutputTokens: 2000,
    },
  });

  const content = response.text?.trim() || "{}";
  const parsed = JSON.parse(content);

  if (!parsed.items || !Array.isArray(parsed.items)) {
    throw new Error("Invalid LLM response: missing items array");
  }

  return parsed.items.map(
    (item: {
      name: string;
      category: string;
      estimated_carbon_kg: number;
      quantity: number;
    }) => ({
      name: item.name,
      category: item.category,
      estimated_carbon_kg: parseFloat(
        Number(item.estimated_carbon_kg).toFixed(2)
      ),
      quantity: item.quantity,
    })
  );
}

// ---------------------------------------------------------------------------
// Static fallback (used if LLM call fails)
// ---------------------------------------------------------------------------

const CARBON_MAP: Record<string, number> = {
  beef: 27.0,
  steak: 27.0,
  burger: 27.0,
  chicken: 6.9,
  pork: 7.6,
  fish: 5.4,
  salmon: 5.4,
  shrimp: 12.0,
  milk: 3.2,
  cheese: 13.5,
  butter: 11.9,
  eggs: 4.8,
  rice: 2.7,
  bread: 1.4,
  vegetables: 2.0,
  salad: 2.0,
  lettuce: 2.0,
  tomato: 2.0,
  potato: 2.0,
  fruit: 1.1,
  apple: 1.1,
  banana: 0.9,
  orange: 1.1,
  chips: 1.5,
  soda: 2.5,
  coffee: 4.5,
  tea: 1.0,
  water: 0.3,
  juice: 1.5,
  yogurt: 3.0,
  pasta: 1.8,
  pizza: 8.0,
};

const DEFAULT_CARBON = 2.5;

function getCarbonForItem(name: string): number {
  const lower = name.toLowerCase().trim();
  for (const [keyword, value] of Object.entries(CARBON_MAP)) {
    if (lower.includes(keyword)) {
      return value;
    }
  }
  return DEFAULT_CARBON;
}

export function calculateReceipt(
  items: { name: string; quantity: number; weight_info?: string }[]
): ReceiptItem[] {
  return items.map((item) => {
    const carbonPerUnit = getCarbonForItem(item.name);
    return {
      name: item.name,
      category: categorizeItem(item.name),
      estimated_carbon_kg: parseFloat(
        (carbonPerUnit * item.quantity).toFixed(2)
      ),
      quantity: item.quantity,
    };
  });
}

function categorizeItem(name: string): string {
  const lower = name.toLowerCase();
  const categories: Record<string, string[]> = {
    Meat: ["beef", "chicken", "pork", "steak", "burger", "fish", "salmon", "shrimp", "lamb", "sausage", "bacon", "ham", "turkey"],
    Dairy: ["milk", "cheese", "butter", "yogurt", "cream"],
    Eggs: ["eggs", "egg"],
    Beverages: ["soda", "coffee", "tea", "water", "juice", "beer", "wine"],
    Grains: ["rice", "bread", "pasta", "cereal", "flour", "tortilla"],
    "Fruits & Vegetables": ["vegetables", "salad", "lettuce", "tomato", "potato", "fruit", "apple", "banana", "orange", "cucumber", "mushroom", "carrot", "onion", "broccoli", "pepper", "corn", "avocado"],
    Snacks: ["chips", "chocolate", "candy"],
  };
  for (const [cat, keywords] of Object.entries(categories)) {
    if (keywords.some((k) => lower.includes(k))) return cat;
  }
  return "Other";
}

export function getTotalCarbon(items: ReceiptItem[]): number {
  return parseFloat(
    items.reduce((sum, item) => sum + item.estimated_carbon_kg, 0).toFixed(2)
  );
}

export function getHighestImpactItem(items: ReceiptItem[]): ReceiptItem {
  return items.reduce((max, item) =>
    item.estimated_carbon_kg > max.estimated_carbon_kg ? item : max
  );
}

export function generateSuggestions(items: ReceiptItem[]): string[] {
  const suggestions: string[] = [];
  const highest = getHighestImpactItem(items);
  const totalCarbon = getTotalCarbon(items);
  const categories = new Set(items.map((i) => i.category));

  // Highest impact item suggestion
  if (highest.category === "Meat") {
    const pctOfTotal = Math.round((highest.estimated_carbon_kg / totalCarbon) * 100);
    suggestions.push(
      `Replace ${highest.name} with a plant-based alternative to save ${highest.estimated_carbon_kg} kg CO2 (${pctOfTotal}% of your total).`
    );
  } else {
    suggestions.push(
      `${highest.name} is your highest carbon item at ${highest.estimated_carbon_kg} kg CO2 — consider lower-impact alternatives.`
    );
  }

  // Category-specific suggestions
  if (categories.has("Dairy") || categories.has("Eggs")) {
    suggestions.push(
      "Switch to oat or almond milk — plant-based dairy alternatives produce up to 60% less CO2."
    );
  } else if (categories.has("Beverages")) {
    const beverages = items.filter((i) => i.category === "Beverages");
    const bevCarbon = beverages.reduce((s, i) => s + i.estimated_carbon_kg, 0);
    suggestions.push(
      `Your beverages account for ${bevCarbon.toFixed(1)} kg CO2. Tap water has nearly zero carbon footprint.`
    );
  }

  // General shopping tips based on basket composition
  if (items.length >= 4) {
    suggestions.push(
      "Buying in bulk reduces packaging waste and can cut your per-item carbon footprint by up to 30%."
    );
  } else if (categories.has("Fruits & Vegetables")) {
    suggestions.push(
      "Great choice on fruits & veggies! Buy seasonal and local to cut transportation emissions by 25%."
    );
  } else {
    suggestions.push(
      "Adding more plant-based foods to your basket can reduce your grocery carbon footprint by up to 50%."
    );
  }

  // Bonus contextual tip
  if (totalCarbon > 20) {
    suggestions.push(
      `Your ${totalCarbon} kg CO2 basket is above average. One meat-free day per week saves ~340 kg CO2/year.`
    );
  } else if (totalCarbon < 5) {
    suggestions.push(
      "Excellent low-carbon basket! Keep it up — you're well below the average grocery trip."
    );
  }

  return suggestions.slice(0, 3);
}
