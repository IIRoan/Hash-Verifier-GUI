import { memo } from "react";

interface ProgressIndicatorProps {
  progress: number;
  fileSize?: number;
}

function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export const ProgressIndicator = memo(function ProgressIndicator({
  progress,
  fileSize,
}: ProgressIndicatorProps) {
  const isLargeFile = fileSize && fileSize > 100 * 1024 * 1024;

  return (
    <div className="w-full max-w-[300px] mt-2">
      <div className="flex flex-col items-center gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="relative w-5 h-5">
            <div className="absolute inset-0 animate-spin">
              <div className="h-5 w-5 border-2 border-accent border-t-transparent rounded-full" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-medium text-accent"></span>
            </div>
          </div>
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            Processing file...
          </span>
        </div>

        {isLargeFile && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
            Large file detected ({formatFileSize(fileSize)}), this may take a
            while
          </span>
        )}

        <div className="w-full flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>{progress.toFixed(1)}% complete</span>
          <span>
            {Math.round(progress) === 100 ? "Finalizing..." : "Processing..."}
          </span>
        </div>
      </div>

      <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-150 ease-out transform-gpu rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
});
