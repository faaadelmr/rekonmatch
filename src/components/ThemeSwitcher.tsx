
"use client";

import { useState, useEffect } from 'react';
import { Moon, Sun, Flower } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Theme = "light" | "dark" | "pink";

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("rekonmatch_theme") as Theme | null;
    if (savedTheme) {
      applyTheme(savedTheme, false);
    }
  }, []);

  const applyTheme = (selectedTheme: Theme, save = true) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark", "pink");
    
    if (selectedTheme !== 'light') {
      root.classList.add(selectedTheme);
    }
    
    root.style.colorScheme = selectedTheme === "dark" ? "dark" : "light";
    if (save) {
      localStorage.setItem("rekonmatch_theme", selectedTheme);
      // Dispatch a custom event to notify other components of the theme change
      window.dispatchEvent(new Event('themeChanged'));
    }
    setTheme(selectedTheme);
  };

  const getIcon = () => {
    switch (theme) {
      case 'light': return <Sun className="h-5 w-5" />;
      case 'dark': return <Moon className="h-5 w-5" />;
      case 'pink': return <Flower className="h-5 w-5" />;
      default: return <Sun className="h-5 w-5" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          {getIcon()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => applyTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => applyTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => applyTheme("pink")}>
          <Flower className="mr-2 h-4 w-4" />
          <span>Pink</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

    