"use client";

import { useEffect, useState } from "react";
import { Receipt, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  "Reading items...",
  "Analyzing carbon footprint...",
  "Generating insights...",
  "Almost done...",
];

const WASTE_STEPS = [
  "Analyzing image...",
  "Classifying material...",
  "Identifying disposal method...",
  "Finalizing...",
];

export function ScanningAnimation({ mode = "receipt" }: { mode?: "receipt" | "waste" }) {
  const [step, setStep] = useState(0);
  const steps = mode === "receipt" ? STEPS : WASTE_STEPS;

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % steps.length);
    }, 800);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="max-w-sm w-full mx-4 shadow-xl border-border/60">
        <CardContent className="py-8 text-center">
          {/* Animated icon */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-2xl" />
            <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-2xl animate-spin-slow" />
            <div className="absolute inset-0 flex items-center justify-center">
              {mode === "receipt" ? (
                <Receipt className="w-8 h-8 text-primary" />
              ) : (
                <Search className="w-8 h-8 text-primary" />
              )}
            </div>
            {/* Scan line */}
            <div className="absolute left-1 right-1 h-0.5 bg-primary/60 rounded-full animate-scan-line" />
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  i <= step ? "bg-primary" : "bg-primary/20"
                }`}
              />
            ))}
          </div>

          {/* Step text */}
          <p className="text-sm text-muted-foreground font-medium">
            {steps[step]}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
