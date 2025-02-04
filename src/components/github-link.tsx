import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";

export function GitHubLink() {
  const openGitHubRepo = async () => {
    openUrl("https://github.com/IIRoan/Hash-Verifier-GUI");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="fixed bottom-4 right-4 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
      onClick={openGitHubRepo}
      title="View on GitHub"
    >
      <Github className="h-5 w-5" />
    </Button>
  );
}
