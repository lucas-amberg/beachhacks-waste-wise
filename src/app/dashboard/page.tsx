"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDashboardData, clearAllData } from "@/lib/store";
import type { ReceiptResult } from "@/lib/types";
import {
  Leaf,
  Receipt,
  Trash2,
  TrendingUp,
  ScanLine,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardData {
  total_carbon_kg: number;
  total_offset_kg: number;
  receipt_count: number;
  waste_scan_count: number;
  sustainability_score: number;
  weekly_breakdown: { day: string; carbon_kg: number }[];
  recent_receipts: ReceiptResult[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setData(getDashboardData());
      setLoading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Skeleton className="h-9 w-48 mb-3" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground mb-4">Failed to load dashboard.</p>
        <Link href="/scan" className={cn(buttonVariants(), "cursor-pointer")}>
          Start Scanning
        </Link>
      </div>
    );
  }

  const hasData = data.receipt_count > 0 || data.waste_scan_count > 0;
  const maxCarbon = hasData
    ? Math.max(...data.weekly_breakdown.map((d) => d.carbon_kg), 1)
    : 1;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {hasData && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive cursor-pointer"
            onClick={() => {
              clearAllData();
              setData(getDashboardData());
            }}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset Data
          </Button>
        )}
      </div>
      <p className="text-muted-foreground mb-8">
        Your sustainability overview at a glance.
      </p>

      {!hasData && (
        <Card className="mb-8 border-border/60 bg-white/70">
          <CardContent className="py-10 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ScanLine className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No scans yet</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Start scanning receipts or waste to see your impact here.
            </p>
            <Link href="/scan" className={cn(buttonVariants(), "cursor-pointer shadow-md shadow-primary/20")}>
              <ScanLine className="w-4 h-4 mr-2" />
              Start Scanning
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Carbon"
          value={`${data.total_carbon_kg} kg`}
          sub="All scans"
          icon={TrendingUp}
          iconBg="bg-red-100"
          iconColor="text-red-600"
          valueColor="text-red-600"
        />
        <StatCard
          label="Receipts"
          value={String(data.receipt_count)}
          sub="Scanned"
          icon={Receipt}
          iconBg="bg-ocean/10"
          iconColor="text-ocean"
          valueColor="text-ocean"
        />
        <StatCard
          label="Waste Scans"
          value={String(data.waste_scan_count)}
          sub="Classified"
          icon={Trash2}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          valueColor="text-purple-600"
        />
        <StatCard
          label="Eco Score"
          value={`${data.sustainability_score}`}
          sub={getScoreLabel(data.sustainability_score)}
          icon={Leaf}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          valueColor="text-primary"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Weekly Chart */}
        {hasData && (
          <Card className="border-border/60 bg-white/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Weekly Carbon (kg CO2)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-40">
                {data.weekly_breakdown.map((day) => (
                  <div key={day.day} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground font-medium tabular-nums">
                      {day.carbon_kg}
                    </span>
                    <div
                      className="w-full rounded-t-lg transition-all bg-gradient-to-t from-primary to-teal"
                      style={{
                        height: `${(day.carbon_kg / maxCarbon) * 100}%`,
                        minHeight: "4px",
                        opacity: 0.3 + (day.carbon_kg / maxCarbon) * 0.7,
                      }}
                    />
                    <span className="text-[10px] text-muted-foreground">{day.day}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Score Ring */}
        <Card className="border-border/60 bg-white/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sustainability Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#A7F3D0" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke={data.sustainability_score >= 60 ? "#059669" : data.sustainability_score >= 40 ? "#eab308" : "#ef4444"}
                    strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${(data.sustainability_score / 100) * 327} 327`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{data.sustainability_score}</span>
                  <span className="text-[10px] text-muted-foreground">out of 100</span>
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-3">
              {data.sustainability_score >= 60
                ? "Great job! Keep making sustainable choices."
                : "Scan more items and offset carbon to improve your score."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Carbon Offset Summary */}
      {data.total_offset_kg > 0 && (
        <Card className="mb-8 border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-primary">Carbon Offset</h2>
              <p className="text-sm text-muted-foreground">
                {data.total_offset_kg} kg CO2 offset so far
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Scans */}
      {data.recent_receipts.length > 0 && (
        <Card className="mb-8 border-border/60 bg-white/70 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Scans</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {data.recent_receipts.length} receipts
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.recent_receipts.map((receipt, i) => (
              <div key={receipt.id || i}>
                {i > 0 && <Separator />}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {receipt.items.map((item) => item.name).join(", ")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {receipt.items.length} items
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm text-red-600">
                      {receipt.total_carbon_kg} kg
                    </div>
                    <div className="text-[10px] text-muted-foreground">CO2</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Link href="/scan" className={cn(buttonVariants(), "w-full cursor-pointer shadow-md shadow-primary/20")}>
        <ScanLine className="w-4 h-4 mr-2" />
        Scan More Items
      </Link>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
  valueColor,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  valueColor: string;
}) {
  return (
    <Card className="border-border/60 bg-white/70 hover:shadow-md transition-shadow cursor-default">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
          <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
        </div>
        <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{sub}</div>
      </CardContent>
    </Card>
  );
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Work";
}
