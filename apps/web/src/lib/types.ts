export interface ReceiptItem {
  name: string;
  category: string;
  estimated_carbon_kg: number;
  quantity: number;
}

export interface ReceiptResult {
  id: string;
  items: ReceiptItem[];
  total_carbon_kg: number;
  highest_impact_item: ReceiptItem;
  suggestions: string[];
}

export interface WasteScanResult {
  id: string;
  category: "recycle" | "compost" | "landfill";
  confidence: number;
  instructions: string;
}

export interface DashboardData {
  total_carbon_kg: number;
  receipt_count: number;
  waste_scan_count: number;
  sustainability_score: number;
  recent_receipts: ReceiptResult[];
}

export interface OffsetResult {
  carbon_offset_kg: number;
  cost_usd: number;
  success: boolean;
}
