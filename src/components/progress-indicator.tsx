import { memo } from "react";

interface ProgressIndicatorProps {
  progress: number;
}

export const ProgressIndicator = memo(function ProgressIndicator({
  progress,
}: ProgressIndicatorProps) {
  return (
    <div className="w-full max-w-[200px] mt-2">
      <div className="flex items-center justify-center gap-2 mb-1">
        <div className="relative w-4 h-4">
          <div className="absolute inset-0 animate-spin">
            <div className="h-4 w-4 border-2 border-zinc-400 border-t-transparent rounded-full" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium">{progress}</span>
          </div>
        </div>
        <span className="text-sm text-zinc-500">Processing file...</span>
      </div>
      <div className="h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-[width] duration-150 ease-out transform-gpu"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
});
