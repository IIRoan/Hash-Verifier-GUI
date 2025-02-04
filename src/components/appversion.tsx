import { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";

export default function AppVersion() {
  const [version, setVersion] = useState("");

  useEffect(() => {
    getVersion()
      .then((ver) => setVersion(ver))
      .catch((error) => console.error("Failed to fetch version:", error));
  }, []);

  return (
    <div
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 text-sm
                 text-zinc-500 dark:text-zinc-400 pointer-events-none"
    >
      Version: {version}
    </div>
  );
}
