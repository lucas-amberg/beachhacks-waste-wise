"use client";

import Link from "next/link";
import {
  ScanLine,
  Recycle,
  BarChart3,
  Camera,
  Cpu,
  PieChart,
  Heart,
  Leaf,
  ArrowRight,
  Zap,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/10 animate-blob" />
        <div className="absolute top-1/3 -left-48 w-80 h-80 bg-ocean/10 animate-blob" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-32 right-16 w-64 h-64 bg-teal/10 animate-blob" style={{ animationDelay: "4s" }} />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
        {/* Hero */}
        <section className="text-center mb-20 animate-fade-in">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            AI-Powered Sustainability
          </Badge>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
            Know Your{" "}
            <span className="bg-gradient-to-r from-primary via-teal to-ocean bg-clip-text text-transparent">
              Carbon Impact
            </span>
            <br />
            Before It Adds Up
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Scan receipts, classify waste, and get personalized sustainability
            insights — all powered by AI, all in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/scan"
              className={cn(
                buttonVariants({ size: "lg" }),
                "cursor-pointer text-base px-8 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
              )}
            >
              <ScanLine className="w-5 h-5 mr-2" />
              Start Scanning
            </Link>
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "cursor-pointer text-base px-8 border-border bg-white/60 hover:bg-white"
              )}
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              View Dashboard
            </Link>
          </div>
        </section>

        {/* Impact Stats */}
        <section className="grid grid-cols-3 gap-4 mb-20 animate-fade-in stagger-1">
          {[
            { value: "10s", label: "Average scan time", icon: Zap },
            { value: "30+", label: "Food items tracked", icon: Leaf },
            { value: "3", label: "AI tips per scan", icon: Cpu },
          ].map((stat) => (
            <Card key={stat.label} className="text-center border-border/60 bg-white/70 backdrop-blur-sm hover:shadow-md transition-shadow cursor-default">
              <CardContent className="pt-6 pb-5">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-3xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Features */}
        <section className="mb-20 animate-fade-in stagger-2">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Everything you need to go{" "}
              <span className="text-primary">green</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Three powerful tools to understand and reduce your environmental footprint.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={ScanLine}
              title="Receipt Scanner"
              description="Upload a receipt to see the carbon footprint of every item you bought."
              color="primary"
            />
            <FeatureCard
              icon={Recycle}
              title="Waste Classifier"
              description="Snap a photo of waste to learn if it's recyclable, compostable, or landfill."
              color="ocean"
            />
            <FeatureCard
              icon={BarChart3}
              title="Impact Dashboard"
              description="Track your weekly carbon footprint and sustainability score over time."
              color="teal"
            />
          </div>
        </section>

        {/* How it works */}
        <section className="mb-20 animate-fade-in stagger-3">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-muted-foreground">Four simple steps to track your impact</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { step: "1", text: "Upload a receipt or waste photo", icon: Camera },
              { step: "2", text: "AI analyzes and classifies items", icon: Cpu },
              { step: "3", text: "View your carbon breakdown", icon: PieChart },
              { step: "4", text: "Get tips & offset your impact", icon: Heart },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center gap-4 text-center">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-ocean/10 flex items-center justify-center">
                    <item.icon className="w-7 h-7 text-primary" />
                  </div>
                  <Badge className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full p-0 flex items-center justify-center text-xs font-bold">
                    {item.step}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-snug">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative rounded-3xl overflow-hidden p-8 sm:p-14 text-center mb-8 animate-fade-in stagger-4">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-emerald to-teal opacity-90" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_70%)]" />
          <div className="relative z-10">
            <Leaf className="w-10 h-10 text-white/80 mx-auto mb-4 animate-float" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-white">
              Ready to reduce your footprint?
            </h2>
            <p className="text-white/80 mb-8 max-w-md mx-auto">
              Start scanning your receipts today and discover how small changes can make a big impact.
            </p>
            <Link
              href="/scan"
              className={cn(
                buttonVariants({ size: "lg", variant: "secondary" }),
                "cursor-pointer text-base px-8 bg-white text-primary hover:bg-white/90 shadow-lg"
              )}
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

const colorMap: Record<string, { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  ocean: { bg: "bg-ocean/10", text: "text-ocean" },
  teal: { bg: "bg-teal/10", text: "text-teal" },
};

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}) {
  const { bg, text } = colorMap[color] ?? colorMap.primary;
  return (
    <Card className="group border-border/60 bg-white/70 backdrop-blur-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-default">
      <CardHeader className="pb-3">
        <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform`}>
          <Icon className={`w-6 h-6 ${text}`} />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
