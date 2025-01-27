import { useState, useEffect, useCallback, memo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X, Upload, Copy, FileIcon, Moon, Sun } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import {
  AlgorithmSelector,
  type Algorithm,
} from "@/components/algorithm-selector";
import { HashDisplay } from "@/components/hash-display";
import { ProgressIndicator } from "@/components/progress-indicator";
import { cn } from "@/lib/utils";

interface ProgressPayload {
  processed: number;
  total: number;
}

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
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const resetState = useCallback(() => {
    setCalculatedHash("");
    setExpectedHash("");
    setVerificationStatus("idle");
    setProgress(null);
  }, []);

  const verifyHash = useCallback(() => {
    if (expectedHash && calculatedHash) {
      const status =
        expectedHash.toLowerCase() === calculatedHash.toLowerCase()
          ? "match"
          : "mismatch";
      setVerificationStatus(status);
    } else {
      setVerificationStatus("idle");
    }
  }, [expectedHash, calculatedHash]);

  useEffect(() => {
    verifyHash();
  }, [verifyHash]);

  useEffect(() => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  useEffect(() => {
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

  const handleFile = useCallback(
    async (path: string) => {
      const name = path.split(/[\\/]/).pop() || "Unknown file";
      setFilePath(path);
      setFileName(name);
      resetState();

      setIsCalculating(true);

      try {
        const response = await invoke<{ hash: string }>("calculate_file_hash", {
          request: {
            path,
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
    },
    [algorithm, resetState]
  );

  const selectFile = useCallback(async () => {
    try {
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
        await handleFile(selected as string);
      }
    } catch (e) {
      console.error("Error selecting file:", e);
    }
  }, [handleFile]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(calculatedHash);
  }, [calculatedHash]);

  const progressPercentage = progress
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    const handleDrop = async (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];

        // Multiple methods to extract file path
        const filePath =
          (file as any).path || (file as any).filepath || file.name;

        if (filePath) {
          try {
            await handleFile(filePath);
          } catch (error) {
            console.error("Error handling dropped file:", error);
          }
        } else {
          selectFile();
        }
      }
    };

    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    dropZone.addEventListener("drop", handleDrop);
    dropZone.addEventListener("dragover", handleDragOver);

    return () => {
      dropZone.removeEventListener("drop", handleDrop);
      dropZone.removeEventListener("dragover", handleDragOver);
    };
  }, [handleFile, selectFile]);

  return (
    <div className="h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-4 transform-gpu">
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
        <Card className="p-4 space-y-4 max-h-[90vh] overflow-y-auto">
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
            ref={dropZoneRef}
            onClick={selectFile}
            className={cn(
              "border-2 border-dashed rounded-lg p-6",
              "flex flex-col items-center justify-center",
              "transition-all duration-150 ease-out transform-gpu",
              "cursor-pointer min-h-[120px]",
              "group",
              "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100/50",
              "relative overflow-hidden"
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
                <span className="text-sm">
                  Drop a file here or click to select
                </span>
                <span className="text-xs text-zinc-500">
                  You can also paste a file path (Ctrl/Cmd + V)
                </span>
              </div>
            )}
          </div>

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
                <div className="relative">
                  <Input
                    value={expectedHash}
                    onChange={(e) => setExpectedHash(e.target.value)}
                    placeholder="Paste hash to verify"
                    className="font-mono text-sm transform-gpu pr-8"
                  />
                  {expectedHash && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-50 hover:opacity-100"
                      onClick={() => setExpectedHash("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {expectedHash && (
                  <HashDisplay hash={expectedHash} isDark={isDark} />
                )}
              </div>

              {verificationStatus !== "idle" && (
                <div
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md transform-gpu transition-colors duration-150",
                    "text-sm font-medium",
                    verificationStatus === "match"
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : "bg-red-500/10 text-red-600 dark:text-red-400"
                  )}
                >
                  {verificationStatus === "match" ? (
                    <>
                      <Check className="h-4 w-4 flex-shrink-0" />
                      <span>The calculated hash matches the expected hash</span>
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 flex-shrink-0" />
                      <span>
                        Hashes don't match. Please verify the expected hash.
                      </span>
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
