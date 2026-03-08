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

  const ICON_SIZE = 16;

  // Toggle between light and dark only
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button 
      variant="ghost" 
      size={"sm"} 
      onClick={toggleTheme}
      className="text-white hover:bg-white/10"
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
