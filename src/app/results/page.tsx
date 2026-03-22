"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ReceiptResult, WasteScanResult, OffsetResult } from "@/lib/types";
import { saveOffset } from "@/lib/store";
import {
  Recycle,
  Leaf,
  Trash2,
  Lightbulb,
  Heart,
  CheckCircle2,
  ScanLine,
  BarChart3,
  Globe,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function ResultsPage() {
  const [scanType, setScanType] = useState<"receipt" | "waste" | null>(null);
  const [receiptResult, setReceiptResult] = useState<ReceiptResult | null>(null);
  const [wasteResult, setWasteResult] = useState<WasteScanResult | null>(null);
  const [offsetResult, setOffsetResult] = useState<OffsetResult | null>(null);
  const [offsetting, setOffsetting] = useState(false);

  useEffect(() => {
    const type = sessionStorage.getItem("scanType") as "receipt" | "waste";
    const data = sessionStorage.getItem("scanResult");
    if (type && data) {
      setScanType(type);
      if (type === "receipt") setReceiptResult(JSON.parse(data));
      else setWasteResult(JSON.parse(data));
    }
  }, []);

  const handleOffset = async (carbonKg: number) => {
    setOffsetting(true);
    try {
      const res = await fetch("/api/offset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carbon_kg: carbonKg }),
      });
      const data = await res.json();
      if (data.success) {
        saveOffset({ carbon_offset_kg: data.carbon_offset_kg, cost_usd: data.cost_usd });
      }
      setOffsetResult(data);
    } catch (err) {
      console.error("Offset failed:", err);
    } finally {
      setOffsetting(false);
    }
  };

  if (!scanType) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground mb-4">No scan results yet.</p>
        <Link href="/scan" className={cn(buttonVariants(), "cursor-pointer")}>
          Go to Scanner
        </Link>
      </div>
    );
  }

  if (scanType === "waste" && wasteResult) {
    return <WasteResults result={wasteResult} />;
  }

  if (scanType === "receipt" && receiptResult) {
    return (
      <ReceiptResults
        result={receiptResult}
        offsetResult={offsetResult}
        offsetting={offsetting}
        onOffset={handleOffset}
      />
    );
  }

  return null;
}

function WasteResults({ result }: { result: WasteScanResult }) {
  const categoryConfig = {
    recycle: {
      bg: "bg-ocean/5",
      border: "border-ocean/20",
      iconBg: "bg-ocean/10",
      text: "text-ocean",
      badgeClass: "bg-ocean/10 text-ocean border-ocean/20",
      progressColor: "bg-ocean",
      label: "Recyclable",
      icon: Recycle,
    },
    compost: {
      bg: "bg-primary/5",
      border: "border-primary/20",
      iconBg: "bg-primary/10",
      text: "text-primary",
      badgeClass: "bg-primary/10 text-primary border-primary/20",
      progressColor: "bg-primary",
      label: "Compostable",
      icon: Leaf,
    },
    landfill: {
      bg: "bg-gray-50",
      border: "border-gray-200",
      iconBg: "bg-gray-100",
      text: "text-gray-600",
      badgeClass: "bg-gray-100 text-gray-600 border-gray-200",
      progressColor: "bg-gray-500",
      label: "Landfill",
      icon: Trash2,
    },
  };

  const config = categoryConfig[result.category];
  const Icon = config.icon;
  const confidencePct = Math.round(result.confidence * 100);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 animate-fade-in">
      <h1 className="text-3xl font-bold mb-2">Waste Classification</h1>
      <p className="text-muted-foreground mb-8">Here&apos;s how to dispose of your item.</p>

      <Card className={`${config.bg} ${config.border} mb-6`}>
        <CardContent className="py-10 text-center">
          <div className={`inline-flex items-center justify-center w-20 h-20 ${config.iconBg} rounded-2xl mb-4`}>
            <Icon className={`w-10 h-10 ${config.text}`} />
          </div>
          <h2 className={`text-2xl font-bold mb-3 ${config.text}`}>
            {config.label}
          </h2>
          <Badge variant="outline" className={`mb-6 ${config.badgeClass}`}>
            {confidencePct}% confidence
          </Badge>
          <div className="max-w-xs mx-auto mb-6">
            <Progress value={confidencePct} className="h-2" />
          </div>
          <Card className="bg-white/80 text-left">
            <CardContent className="py-4">
              <h3 className="font-semibold text-sm mb-1">Disposal Instructions</h3>
              <p className="text-sm text-muted-foreground">{result.instructions}</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Link href="/scan" className={cn(buttonVariants(), "flex-1 cursor-pointer shadow-md shadow-primary/20")}>
          <ScanLine className="w-4 h-4 mr-2" />
          Scan Another Item
        </Link>
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }), "flex-1 cursor-pointer bg-white")}>
          <BarChart3 className="w-4 h-4 mr-2" />
          View Dashboard
        </Link>
      </div>
    </div>
  );
}

function ReceiptResults({
  result,
  offsetResult,
  offsetting,
  onOffset,
}: {
  result: ReceiptResult;
  offsetResult: OffsetResult | null;
  offsetting: boolean;
  onOffset: (kg: number) => void;
}) {
  const maxCarbon = Math.max(...result.items.map((i) => i.estimated_carbon_kg));

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 animate-fade-in">
      <h1 className="text-3xl font-bold mb-2">Carbon Breakdown</h1>
      <p className="text-muted-foreground mb-8">
        Your receipt&apos;s environmental impact at a glance.
      </p>

      {/* Total Card */}
      <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 via-teal/5 to-ocean/5">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Total Carbon Footprint</div>
              <div className="text-4xl font-bold text-foreground">
                {result.total_carbon_kg}
                <span className="text-lg text-muted-foreground ml-1">kg CO2</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Equivalent to driving ~{Math.round(result.total_carbon_kg * 3.9)} km
              </div>
            </div>
            <div className="w-20 h-20 bg-white/80 rounded-2xl flex items-center justify-center shadow-sm">
              <Leaf className="w-10 h-10 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items with carbon bars */}
      <Card className="mb-6 border-border/60 bg-white/70 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Items</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {result.items.length} items
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {result.items.map((item, i) => {
            const isHighest = item.name === result.highest_impact_item.name;
            const barWidth = (item.estimated_carbon_kg / maxCarbon) * 100;
            return (
              <div
                key={i}
                className={`px-6 py-4 ${
                  i < result.items.length - 1 ? "border-b border-border/60" : ""
                } ${isHighest ? "bg-red-50/50" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{item.name}</span>
                    {isHighest && (
                      <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200">
                        Highest Impact
                      </Badge>
                    )}
                  </div>
                  <span className="font-semibold tabular-nums">
                    {item.estimated_carbon_kg}
                    <span className="text-xs text-muted-foreground ml-0.5">kg</span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isHighest
                          ? "bg-gradient-to-r from-red-400 to-red-500"
                          : "bg-gradient-to-r from-primary/60 to-primary"
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-16 text-right">
                    {item.category}
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <Card className="mb-6 border-border/60 bg-white/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              AI Sustainability Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {result.suggestions.map((s, i) => (
                <li
                  key={i}
                  className="flex gap-3 text-sm bg-primary/5 rounded-xl p-3"
                >
                  <span className="w-6 h-6 bg-primary/15 rounded-full flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Offset */}
      {!offsetResult ? (
        <Button
          onClick={() => onOffset(result.total_carbon_kg)}
          disabled={offsetting}
          className="w-full cursor-pointer py-6 text-base shadow-lg shadow-primary/25 animate-pulse-green"
          size="lg"
        >
          <Heart className="w-5 h-5 mr-2" />
          {offsetting
            ? "Processing..."
            : `Offset ${result.total_carbon_kg} kg CO2 for $${(
                result.total_carbon_kg * 0.1
              ).toFixed(2)}`}
        </Button>
      ) : (
        <Card className="border-primary/30 bg-primary/5 text-center">
          <CardContent className="py-8">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
            <div className="text-xl font-bold text-primary mb-1">Offset Successful!</div>
            <p className="text-sm text-muted-foreground">
              You offset {offsetResult.carbon_offset_kg} kg CO2 for ${offsetResult.cost_usd.toFixed(2)}.
            </p>
            <p className="text-xs text-primary/70 mt-2">
              Thank you for making a difference!
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 mt-6">
        <Link href="/scan" className={cn(buttonVariants({ variant: "outline" }), "flex-1 cursor-pointer bg-white")}>
          <ScanLine className="w-4 h-4 mr-2" />
          Scan Another
        </Link>
        <Link href="/dashboard" className={cn(buttonVariants(), "flex-1 cursor-pointer shadow-md shadow-primary/20")}>
          <BarChart3 className="w-4 h-4 mr-2" />
          View Dashboard
        </Link>
      </div>
    </div>
  );
}
