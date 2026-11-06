"use client";

import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const ThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const ICON_SIZE = 18;

  // Toggle between light and dark only
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button 
      variant="ghost" 
      size={"sm"} 
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="h-10 w-10 rounded-full bg-white/10 p-0 text-white ring-1 ring-white/20 transition hover:bg-white/20 hover:text-white active:scale-95"
    >
      {theme === "dark" ? (
        <Sun
          key="light"
          size={ICON_SIZE}
          className={"text-white"}
        />
      ) : (
        <Moon
          key="dark"
          size={ICON_SIZE}
          className={"text-white"}
        />
      )}
    </Button>
  );
};

export { ThemeSwitcher };
