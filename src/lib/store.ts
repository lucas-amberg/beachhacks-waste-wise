import type { ReceiptResult, WasteScanResult } from "./types";

const RECEIPTS_KEY = "wastewise_receipts";
const WASTE_SCANS_KEY = "wastewise_waste_scans";
const OFFSETS_KEY = "wastewise_offsets";

export function saveReceipt(receipt: ReceiptResult) {
  const existing = getReceipts();
  existing.unshift(receipt);
  if (typeof window !== "undefined") {
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify(existing));
  }
}

export function getReceipts(): ReceiptResult[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(RECEIPTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveWasteScan(scan: WasteScanResult) {
  const existing = getWasteScans();
  existing.unshift(scan);
  if (typeof window !== "undefined") {
    localStorage.setItem(WASTE_SCANS_KEY, JSON.stringify(existing));
  }
}

export function getWasteScans(): WasteScanResult[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(WASTE_SCANS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveOffset(offset: { carbon_offset_kg: number; cost_usd: number }) {
  const existing = getOffsets();
  existing.unshift(offset);
  if (typeof window !== "undefined") {
    localStorage.setItem(OFFSETS_KEY, JSON.stringify(existing));
  }
}

export function getOffsets(): { carbon_offset_kg: number; cost_usd: number }[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(OFFSETS_KEY);
  return data ? JSON.parse(data) : [];
}

export function clearAllData() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RECEIPTS_KEY);
  localStorage.removeItem(WASTE_SCANS_KEY);
  localStorage.removeItem(OFFSETS_KEY);
}

export function getDashboardData() {
  const receipts = getReceipts();
  const wasteScans = getWasteScans();
  const offsets = getOffsets();

  const totalCarbon = receipts.reduce((sum, r) => sum + r.total_carbon_kg, 0);
  const totalOffset = offsets.reduce((sum, o) => sum + o.carbon_offset_kg, 0);
  const netCarbon = Math.max(0, totalCarbon - totalOffset);

  // Distribute carbon across week based on receipt count (deterministic)
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weights = [0.12, 0.15, 0.10, 0.18, 0.16, 0.17, 0.12];
  const weeklyBreakdown = days.map((day, i) => ({
    day,
    carbon_kg: receipts.length > 0
      ? parseFloat((totalCarbon * weights[i]).toFixed(1))
      : 0,
  }));

  // Score: 100 if no carbon, decreasing with more carbon, boosted by offsets
  const rawScore = receipts.length === 0
    ? 50
    : Math.max(0, Math.min(100, 100 - netCarbon * 0.8 + offsets.length * 5));

  return {
    total_carbon_kg: parseFloat(totalCarbon.toFixed(1)),
    total_offset_kg: parseFloat(totalOffset.toFixed(1)),
    receipt_count: receipts.length,
    waste_scan_count: wasteScans.length,
    sustainability_score: Math.round(rawScore),
    recent_receipts: receipts.slice(0, 5),
    weekly_breakdown: weeklyBreakdown,
  };
}
