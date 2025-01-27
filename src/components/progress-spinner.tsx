import { motion } from "framer-motion";

export function ProgressSpinner() {
  return (
    <motion.div
      className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );
}
