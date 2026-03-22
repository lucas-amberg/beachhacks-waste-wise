import Link from "next/link";
import { Leaf } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="mt-auto bg-white/50 backdrop-blur-sm">
      <Separator className="bg-border/60" />
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <div className="w-6 h-6 bg-gradient-to-br from-primary to-teal rounded-md flex items-center justify-center">
            <Leaf className="w-3.5 h-3.5 text-white" />
          </div>
          <span>WasteWise</span>
        </Link>
        <p className="text-xs text-muted-foreground">
          Reducing carbon footprint, one receipt at a time.
        </p>
      </div>
    </footer>
  );
}
