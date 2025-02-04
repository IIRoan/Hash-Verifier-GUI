import React from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  isDark: boolean;
  toggleTheme: () => void;
}

export default function ThemeToggle({ isDark, toggleTheme }: ThemeToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="fixed bottom-4 left-4 text-zinc-500 dark:text-zinc-400
                 hover:text-black dark:hover:text-white transition-colors"
      onClick={toggleTheme}
      title="Toggle Theme"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
