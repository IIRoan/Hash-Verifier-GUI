import { useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface HashDisplayProps {
  hash: string;
  isDark: boolean;
  onCopy?: () => void;
}

export const HashDisplay = memo(function HashDisplay({
  hash,
  onCopy,
}: HashDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (onCopy) {
      onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [onCopy]);

  if (!hash) return null;

  const formattedHash = hash.match(/.{1,8}/g)?.join(" ") || hash;

  return (
    <div className="relative font-mono bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 transform-gpu group">
      <div className="text-sm text-zinc-800 dark:text-zinc-200 pr-8">
        {formattedHash}
      </div>
      {onCopy && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-150"
          onClick={handleCopy}
        >
          <div className="relative w-4 h-4">
            <div
              className={cn(
                "absolute inset-0 transition-all duration-300 transform",
                copied ? "opacity-0 scale-50" : "opacity-100 scale-100"
              )}
            >
              <Copy className="w-4 h-4" />
            </div>
            <div
              className={cn(
                "absolute inset-0 text-green-500 transition-all duration-300 transform",
                copied ? "opacity-100 scale-100" : "opacity-0 scale-50"
              )}
            >
              <Check className="w-4 h-4" />
            </div>
          </div>
        </Button>
      )}
    </div>
  );
});
