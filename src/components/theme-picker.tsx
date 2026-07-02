import { Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

type ThemeId = "aurora" | "ocean" | "sunset" | "forest" | "mono";

const THEMES: {
  id: ThemeId;
  name: string;
  description: string;
  swatch: string[];
  font: string;
}[] = [
  {
    id: "aurora",
    name: "Aurora",
    description: "Violet · Pink · Amber",
    swatch: ["#a855f7", "#ec4899", "#f59e0b"],
    font: "Inter",
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Blue · Teal · Cyan",
    swatch: ["#3b82f6", "#0ea5e9", "#14b8a6"],
    font: "Space Grotesk + DM Sans",
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Coral · Orange · Gold",
    swatch: ["#ef4444", "#f97316", "#f59e0b"],
    font: "Poppins",
  },
  {
    id: "forest",
    name: "Forest",
    description: "Emerald · Lime · Olive",
    swatch: ["#059669", "#65a30d", "#a3a300"],
    font: "Lora + DM Sans",
  },
  {
    id: "mono",
    name: "Mono",
    description: "Neutral + Neon accent",
    swatch: ["#111111", "#666666", "#7cff3f"],
    font: "JetBrains Mono + Inter",
  },
];

export function ThemePicker() {
  const [current, setCurrent] = useState<ThemeId>("aurora");

  useEffect(() => {
    const stored = (localStorage.getItem("color-theme") as ThemeId) || "aurora";
    setCurrent(stored);
  }, []);

  const apply = (id: ThemeId) => {
    setCurrent(id);
    localStorage.setItem("color-theme", id);
    if (id === "aurora") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Choose theme">
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Color theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => apply(t.id)}
            className="flex items-center gap-3 py-2.5"
          >
            <div className="flex -space-x-1.5">
              {t.swatch.map((c) => (
                <span
                  key={c}
                  className="h-5 w-5 rounded-full border-2 border-background"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{t.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {t.description} · {t.font}
              </div>
            </div>
            {current === t.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}