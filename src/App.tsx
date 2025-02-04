import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X, Upload, FileIcon, Moon, Sun } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { GitHubLink } from "@/components/github-link";
import AppVersion from "@/components/appversion";

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
  const [, setFilePath] = useState<string>("");
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

  // Set up event listener for hash progress
  useEffect(() => {
    const unlisten = listen<ProgressPayload>("hash-progress", (event) => {
      setProgress(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn()); // Cleanup listener
    };
  }, []);

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

  const onAlgorithmSelect = useCallback(() => {
    setFilePath("");
    setFileName(null);
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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <AlgorithmSelector
          value={algorithm}
          onChange={setAlgorithm}
          onSelect={onAlgorithmSelect}
        />

        <div
          onClick={selectFile}
          className={cn(
            "border-2 border-dashed rounded-lg p-8",
            "flex flex-col items-center justify-center",
            "transition-all duration-150 ease-out transform-gpu",
            "cursor-pointer min-h-[180px]",
            "group hover:bg-accent/5",
            "border-zinc-300 hover:border-accent",
            "dark:border-zinc-700 dark:hover:border-accent",
            "dark:hover:bg-accent/10"
          )}
        >
          {fileName ? (
            <div className="flex flex-col items-center gap-4 text-zinc-600 dark:text-zinc-300">
              <FileIcon className="w-12 h-12 text-accent/70" />
              <span className="text-base font-medium">{fileName}</span>
              {isCalculating && progress && (
                <ProgressIndicator
                  progress={progressPercentage}
                  fileSize={progress.total}
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-zinc-500 dark:text-zinc-400">
              <Upload className="w-12 h-12 group-hover:text-accent transition-colors" />
              <span className="text-base font-medium group-hover:text-accent transition-colors">
                Select File
              </span>
              <span className="text-sm text-zinc-400 dark:text-zinc-500">
                Click to browse files
              </span>
            </div>
          )}
        </div>

        {(isCalculating || calculatedHash) && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {algorithm.toUpperCase()} Hash
              </div>
              {isCalculating ? (
                <div className="h-[52px] bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 animate-pulse" />
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
                Expected Hash
              </div>
              <div className="relative">
                <Input
                  value={expectedHash}
                  onChange={(e) => setExpectedHash(e.target.value)}
                  placeholder="Enter expected hash (optional)"
                  className="font-mono text-sm pr-8 focus-visible:ring-accent"
                />
                {expectedHash && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-50 hover:opacity-100 hover:text-accent"
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
                  "flex items-center gap-3 p-3 rounded-md",
                  "text-sm font-medium",
                  "transition-colors duration-200",
                  verificationStatus === "match"
                    ? "bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-foreground"
                    : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                )}
              >
                {verificationStatus === "match" ? (
                  <>
                    <Check className="h-5 w-5 flex-shrink-0" />
                    <span>The calculated hash matches the expected hash</span>
                  </>
                ) : (
                  <>
                    <X className="h-5 w-5 flex-shrink-0" />
                    <span>
                      Hashes do not match. Please verify the expected hash.
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <GitHubLink />
      <AppVersion />
      <Button
        variant="ghost"
        size="icon"
        className="fixed bottom-4 left-4 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
        onClick={toggleTheme}
        title="Toggle Theme"
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>
    </div>
  );
}
