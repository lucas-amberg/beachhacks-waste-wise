"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveReceipt, saveWasteScan } from "@/lib/store";
import { ScanningAnimation } from "@/components/ScanningAnimation";
import {
  Camera,
  Upload,
  Plus,
  X,
  ScanLine,
  Recycle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ScanMode = "receipt" | "waste";

interface ItemInput {
  name: string;
  quantity: number;
}

export default function ScanPage() {
  const router = useRouter();
  const [mode, setMode] = useState<ScanMode>("receipt");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Receipt state
  const [items, setItems] = useState<ItemInput[]>([
    { name: "", quantity: 1 },
  ]);

  // Waste state
  const [wasteDescription, setWasteDescription] = useState("");

  // Image upload state
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [wasteImage, setWasteImage] = useState<string | null>(null);
  const receiptFileRef = useRef<HTMLInputElement>(null);
  const wasteFileRef = useRef<HTMLInputElement>(null);

  const readImageAsDataUrl = (
    file: File,
    setter: (url: string | null) => void
  ) => {
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  const resizeImage = (dataUrl: string, maxDim = 1024): Promise<string> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = dataUrl;
    });

  const addItem = () => setItems([...items, { name: "", quantity: 1 }]);

  const updateItem = (
    index: number,
    field: keyof ItemInput,
    value: string | number
  ) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleReceiptSubmit = async (image?: string) => {
    const validItems = items.filter((i) => i.name.trim());
    if (!image && validItems.length === 0) return;

    setError(null);
    setLoading(true);
    try {
      const payload = validItems.length > 0
        ? { items: validItems }
        : { image: image! };

      const res = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to analyze receipt.");
        return;
      }
      saveReceipt(data);
      sessionStorage.setItem("scanResult", JSON.stringify(data));
      sessionStorage.setItem("scanType", "receipt");
      router.push("/results");
    } catch {
      setError("Failed to analyze receipt. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleWasteSubmit = async () => {
    if (!wasteDescription.trim()) return;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/scan-waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: wasteDescription }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to classify waste.");
        return;
      }
      saveWasteScan(data);
      sessionStorage.setItem("scanResult", JSON.stringify(data));
      sessionStorage.setItem("scanType", "waste");
      router.push("/results");
    } catch {
      setError("Failed to classify waste. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const demoPresets = [
    {
      label: "Quick Demo",
      items: [
        { name: "beef", quantity: 1 },
        { name: "milk", quantity: 1 },
        { name: "chips", quantity: 2 },
      ],
    },
    {
      label: "Grocery Trip",
      items: [
        { name: "chicken", quantity: 2 },
        { name: "rice", quantity: 1 },
        { name: "cheese", quantity: 1 },
        { name: "soda", quantity: 3 },
        { name: "banana", quantity: 4 },
      ],
    },
    {
      label: "Eco Meal",
      items: [
        { name: "vegetables", quantity: 2 },
        { name: "bread", quantity: 1 },
        { name: "apple", quantity: 3 },
        { name: "tea", quantity: 1 },
      ],
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {loading && <ScanningAnimation mode={mode} />}

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Scan</h1>
        <p className="text-muted-foreground">
          Enter receipt items or describe waste to classify it.
        </p>
      </div>

      {/* Error display */}
      {error && (
        <Card className="border-destructive/50 bg-red-50 mb-6">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <span className="text-sm text-destructive flex-1">{error}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive/60 hover:text-destructive cursor-pointer"
              onClick={() => setError(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs
        value={mode}
        onValueChange={(v) => setMode(v as ScanMode)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 mb-8 bg-secondary/50">
          <TabsTrigger value="receipt" className="cursor-pointer data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
            <ScanLine className="w-4 h-4 mr-2" />
            Receipt Scanner
          </TabsTrigger>
          <TabsTrigger value="waste" className="cursor-pointer data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
            <Recycle className="w-4 h-4 mr-2" />
            Waste Classifier
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receipt" className="animate-fade-in">
          {/* Image Upload */}
          <Card
            className="border-2 border-dashed border-border hover:border-primary/40 transition-colors cursor-pointer mb-6 bg-white/50"
            onClick={() => receiptFileRef.current?.click()}
          >
            <CardContent className="py-8 text-center">
              <input
                ref={receiptFileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async () => {
                    const resized = await resizeImage(reader.result as string);
                    setReceiptImage(resized);
                    handleReceiptSubmit(resized);
                  };
                  reader.readAsDataURL(file);
                }}
              />
              {receiptImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={receiptImage}
                  alt="Receipt"
                  className="max-h-48 mx-auto rounded-xl object-contain"
                />
              ) : (
                <div>
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Camera className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    Tap to upload receipt photo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    or enter items manually below
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Items</h2>
            <div className="flex gap-1.5">
              {demoPresets.map((preset) => (
                <Badge
                  key={preset.label}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-colors text-xs"
                  onClick={() => setItems(preset.items)}
                >
                  {preset.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {items.map((item, i) => (
              <div key={i} className="flex gap-3">
                <Input
                  type="text"
                  placeholder="Item name (e.g. beef, milk)"
                  value={item.name}
                  onChange={(e) => updateItem(i, "name", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (i === items.length - 1 && item.name.trim()) addItem();
                      else handleReceiptSubmit(receiptImage ?? undefined);
                    }
                  }}
                  className="flex-1 bg-white border-border"
                />
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(i, "quantity", parseInt(e.target.value) || 1)
                  }
                  className="w-20 bg-white text-center border-border"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 cursor-pointer text-muted-foreground hover:text-destructive hover:border-destructive/30"
                  onClick={() => removeItem(i)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-dashed cursor-pointer text-muted-foreground hover:text-primary hover:border-primary/40"
              onClick={addItem}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
            <Button
              className="flex-1 cursor-pointer shadow-md shadow-primary/20"
              onClick={() => handleReceiptSubmit(receiptImage ?? undefined)}
              disabled={loading || (items.every((i) => !i.name.trim()) && !receiptImage)}
            >
              {loading ? "Analyzing..." : "Calculate Carbon"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="waste" className="animate-fade-in">
          {/* Image Upload */}
          <Card
            className="border-2 border-dashed border-border hover:border-primary/40 transition-colors cursor-pointer mb-6 bg-white/50"
            onClick={() => wasteFileRef.current?.click()}
          >
            <CardContent className="py-8 text-center">
              <input
                ref={wasteFileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) readImageAsDataUrl(file, setWasteImage);
                }}
              />
              {wasteImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={wasteImage}
                  alt="Waste item"
                  className="max-h-48 mx-auto rounded-xl object-contain"
                />
              ) : (
                <div>
                  <div className="w-14 h-14 bg-ocean/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-7 h-7 text-ocean" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    Tap to upload waste photo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    or describe the item below
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <h2 className="font-semibold mb-3">Describe the waste item</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { label: "Plastic Bottle", value: "plastic water bottle" },
              { label: "Food Scraps", value: "food scraps and vegetable peels" },
              { label: "Cardboard Box", value: "cardboard shipping box" },
              { label: "Styrofoam", value: "styrofoam takeout container" },
              { label: "Glass Jar", value: "glass jar" },
              { label: "Aluminum Can", value: "aluminum soda can" },
            ].map((preset) => (
              <Badge
                key={preset.value}
                variant={wasteDescription === preset.value ? "default" : "outline"}
                className={`cursor-pointer transition-colors ${
                  wasteDescription === preset.value
                    ? "bg-primary text-white"
                    : "hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                }`}
                onClick={() => setWasteDescription(preset.value)}
              >
                {preset.label}
              </Badge>
            ))}
          </div>
          <Textarea
            placeholder="e.g. plastic water bottle, food scraps, styrofoam container..."
            value={wasteDescription}
            onChange={(e) => setWasteDescription(e.target.value)}
            rows={4}
            className="mb-6 bg-white border-border resize-none"
          />
          <Button
            className="w-full cursor-pointer shadow-md shadow-primary/20"
            onClick={handleWasteSubmit}
            disabled={loading || !wasteDescription.trim()}
          >
            <Recycle className="w-4 h-4 mr-2" />
            {loading ? "Classifying..." : "Classify Waste"}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
