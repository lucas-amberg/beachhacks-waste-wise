import { NextResponse } from "next/server";

// Mock dashboard data - in production this would query Supabase
export async function GET() {
  const mockData = {
    total_carbon_kg: 47.3,
    receipt_count: 5,
    waste_scan_count: 12,
    sustainability_score: 72,
    recent_receipts: [
      {
        id: "1",
        items: [
          { name: "chicken", category: "Meat", estimated_carbon_kg: 6.9, quantity: 1 },
          { name: "rice", category: "Grains", estimated_carbon_kg: 2.7, quantity: 1 },
        ],
        total_carbon_kg: 9.6,
        highest_impact_item: { name: "chicken", category: "Meat", estimated_carbon_kg: 6.9, quantity: 1 },
        suggestions: [],
      },
      {
        id: "2",
        items: [
          { name: "beef", category: "Meat", estimated_carbon_kg: 27.0, quantity: 1 },
          { name: "soda", category: "Beverages", estimated_carbon_kg: 2.5, quantity: 2 },
        ],
        total_carbon_kg: 32.0,
        highest_impact_item: { name: "beef", category: "Meat", estimated_carbon_kg: 27.0, quantity: 1 },
        suggestions: [],
      },
    ],
    weekly_breakdown: [
      { day: "Mon", carbon_kg: 5.2 },
      { day: "Tue", carbon_kg: 8.1 },
      { day: "Wed", carbon_kg: 3.4 },
      { day: "Thu", carbon_kg: 12.6 },
      { day: "Fri", carbon_kg: 7.8 },
      { day: "Sat", carbon_kg: 6.2 },
      { day: "Sun", carbon_kg: 4.0 },
    ],
  };

  return NextResponse.json(mockData);
}
