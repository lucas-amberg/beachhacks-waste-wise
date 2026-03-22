import { ReceiptItem } from "./types";

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

export function getCarbonForItem(name: string): number {
  const lower = name.toLowerCase().trim();
  for (const [keyword, value] of Object.entries(CARBON_MAP)) {
    if (lower.includes(keyword)) {
      return value;
    }
  }
  return DEFAULT_CARBON;
}

export function calculateReceipt(
  items: { name: string; quantity: number }[]
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
    Meat: ["beef", "chicken", "pork", "steak", "burger", "fish", "salmon", "shrimp"],
    Dairy: ["milk", "cheese", "butter", "yogurt", "eggs"],
    Beverages: ["soda", "coffee", "tea", "water", "juice"],
    Grains: ["rice", "bread", "pasta", "chips"],
    "Fruits & Vegetables": ["vegetables", "salad", "lettuce", "tomato", "potato", "fruit", "apple", "banana", "orange"],
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
  if (categories.has("Dairy")) {
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
