import { useState, useEffect, useCallback, memo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X, Upload, Copy, FileIcon, Moon, Sun } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { AlgorithmSelector, Algorithm } from "@/components/algorithm-selector";
import { cn } from "@/lib/utils";

interface ProgressPayload {
  processed: number;
  total: number;
}

// Memoized HashDisplay component
const HashDisplay = memo(function HashDisplay({
  hash,
  isDark,
  onCopy,
}: {
  hash: string;
  isDark: boolean;
  onCopy?: () => void;
}) {
  if (!hash) return null;

  // Split hash into groups of 4 for better readability
  const formattedHash = hash.match(/.{1,4}/g)?.join(" ") || hash;

  return (
    <div className="relative font-mono bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 break-all transform-gpu">
      <div className="text-sm text-zinc-800 dark:text-zinc-200">
        {formattedHash}
      </div>
      {onCopy && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity duration-150"
          onClick={() => {
            onCopy();
          }}
        >
          <Copy className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
});

// Memoized progress component
const ProgressIndicator = memo(function ProgressIndicator({
  progress,
}: {
  progress: number;
}) {
  return (
    <div className="w-full max-w-[200px] mt-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="animate-spin">◌</div>
        <span className="text-sm">{progress}%</span>
      </div>
      <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-[width] duration-150 ease-out transform-gpu"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
});

export default function HashVerifier() {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [algorithm, setAlgorithm] = useState<Algorithm>("sha256");
  const [calculatedHash, setCalculatedHash] = useState<string>("");
  const [expectedHash, setExpectedHash] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<
    "idle" | "match" | "mismatch"
  >("idle");
  const [isCalculating, setIsCalculating] = useState(false);
  const [progress, setProgress] = useState<ProgressPayload | null>(null);
  const [isDark, setIsDark] = useState(false);

  const resetState = useCallback(() => {
    setCalculatedHash("");
    setExpectedHash("");
    setVerificationStatus("idle");
    setProgress(null);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    // Throttle progress updates to every 100ms for better performance
    let lastUpdate = 0;
    const unsubscribe = listen<ProgressPayload>("hash-progress", (event) => {
      const now = Date.now();
      if (now - lastUpdate > 100) {
        setProgress(event.payload);
        lastUpdate = now;
      }
    });

    return () => {
      unsubscribe.then((fn) => fn());
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
    document.documentElement.classList.toggle("dark");
  }, []);

  const selectFile = useCallback(async () => {
    try {
      // Use the dialog plugin to select a file
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "All Files",
            extensions: ["*"],
          },
        ],
      });

      if (selected) {
        const path = selected as string;
        const name = path.split(/[\\/]/).pop() || "Unknown file";
        setFilePath(path);
        setFileName(name);
        resetState();
      }
    } catch (e) {
      console.error("Error selecting file:", e);
    }
  }, [resetState]);

  const calculateHash = useCallback(async () => {
    if (!filePath) return;

    setIsCalculating(true);
    resetState();

    try {
      const response = await invoke<{ hash: string }>("calculate_file_hash", {
        request: {
          path: filePath,
          algorithm: algorithm.toLowerCase(),
        },
      });

      setCalculatedHash(response.hash);
    } catch (error) {
      console.error("Error calculating hash:", error);
    } finally {
      setIsCalculating(false);
      setProgress(null);
    }
  }, [filePath, algorithm, resetState]);

  const verifyHash = useCallback(() => {
    if (expectedHash && calculatedHash) {
      const status =
        expectedHash.toLowerCase() === calculatedHash.toLowerCase()
          ? "match"
          : "mismatch";
      setVerificationStatus(status);
    }
  }, [expectedHash, calculatedHash]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(calculatedHash);
  }, [calculatedHash]);

  const progressPercentage = progress
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-4 transform-gpu">
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 right-4 transition-transform duration-150 ease-out transform-gpu"
        onClick={toggleTheme}
      >
        <div className="transform-gpu transition-transform duration-150">
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </div>
      </Button>

      <div className="w-full max-w-2xl transform-gpu">
        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Hash Algorithm
            </div>
            <AlgorithmSelector
              value={algorithm}
              onChange={setAlgorithm}
              onSelect={resetState}
            />
          </div>

          <div
            onClick={selectFile}
            className={cn(
              "border-2 border-dashed rounded-lg p-8",
              "flex flex-col items-center justify-center",
              "transition-[background,border-color] duration-150 ease-out transform-gpu",
              "cursor-pointer",
              isDark
                ? "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700/30"
                : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
            )}
          >
            {fileName ? (
              <div className="flex flex-col items-center gap-2 text-zinc-400">
                <FileIcon className="w-8 h-8" />
                <span className="text-sm">{fileName}</span>
                {progress && (
                  <ProgressIndicator progress={progressPercentage} />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-zinc-400">
                <Upload className="w-8 h-8" />
                <span className="text-sm">Click to select a file</span>
              </div>
            )}
          </div>

          {filePath && !isCalculating && !calculatedHash && (
            <Button
              className="w-full transform-gpu"
              onClick={calculateHash}
              disabled={isCalculating}
            >
              Calculate Hash
            </Button>
          )}

          {(isCalculating || calculatedHash) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {algorithm.toUpperCase()} Hash
                </div>
                {isCalculating ? (
                  <div className="h-[52px] bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 animate-pulse" />
                ) : (
                  <HashDisplay
                    hash={calculatedHash}
                    isDark={isDark}
                    onCopy={copyToClipboard}
                  />
                )}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Expected Hash (Optional)
                </div>
                <div className="space-y-2">
                  <Input
                    value={expectedHash}
                    onChange={(e) => {
                      setExpectedHash(e.target.value);
                      setVerificationStatus("idle");
                    }}
                    placeholder="Enter expected hash for verification"
                    className="font-mono text-sm transform-gpu"
                  />
                  {expectedHash && (
                    <HashDisplay hash={expectedHash} isDark={isDark} />
                  )}
                  <Button
                    onClick={verifyHash}
                    disabled={!expectedHash || !calculatedHash}
                    className="w-full transform-gpu"
                  >
                    Verify
                  </Button>
                </div>
              </div>

              {verificationStatus !== "idle" && (
                <div
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-md transform-gpu transition-colors duration-150",
                    verificationStatus === "match"
                      ? "bg-green-500/20 text-green-500"
                      : "bg-red-500/20 text-red-500"
                  )}
                >
                  {verificationStatus === "match" ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span className="text-sm">Hash matches!</span>
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4" />
                      <span className="text-sm">Hash mismatch!</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
