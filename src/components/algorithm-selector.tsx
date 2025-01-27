import { memo } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const algorithms = [
  { value: "sha256", label: "SHA-256", description: "Recommended" },
  { value: "sha512", label: "SHA-512", description: "More secure" },
  { value: "md5", label: "MD5", description: "Legacy" },
] as const;

export type Algorithm = (typeof algorithms)[number]["value"];

interface AlgorithmSelectorProps {
  value: Algorithm;
  onChange: (value: Algorithm) => void;
  className?: string;
  onSelect?: () => void;
}

export const AlgorithmSelector = memo(function AlgorithmSelector({
  value,
  onChange,
  className,
  onSelect,
}: AlgorithmSelectorProps) {
  const handleAlgorithmChange = (newValue: Algorithm) => {
    if (value !== newValue) {
      onChange(newValue);
      onSelect?.();
    }
  };

  return (
    <div
      className={cn(
        "grid grid-cols-3 rounded-lg p-1 bg-zinc-100 dark:bg-zinc-800/50 w-full",
        "transform-gpu",
        className
      )}
    >
      {algorithms.map((algorithm) => (
        <button
          key={algorithm.value}
          onClick={() => handleAlgorithmChange(algorithm.value)}
          className={cn(
            "relative flex flex-col items-start px-3 py-2 rounded-md text-sm",
            "transition-[background,transform] duration-150 ease-out transform-gpu",
            "hover:bg-white/50 dark:hover:bg-zinc-700/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
            value === algorithm.value && [
              "bg-white dark:bg-zinc-700",
              "scale-[0.98]",
            ]
          )}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-medium transition-colors duration-150",
                value === algorithm.value
                  ? "text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-600 dark:text-zinc-400"
              )}
            >
              {algorithm.label}
            </span>
            {value === algorithm.value && (
              <span className="text-blue-500 animate-in zoom-in duration-150">
                <Check className="w-4 h-4" />
              </span>
            )}
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-500">
            {algorithm.description}
          </span>
        </button>
      ))}
    </div>
  );
});
