"use client";

import { HTMLMotionProps, motion } from "framer-motion";

import { cn } from "@/lib/utils";

type AnimatedPanelProps = HTMLMotionProps<"div"> & {
  delay?: number;
  hoverLift?: boolean;
};

export default function AnimatedPanel({
  children,
  className,
  delay = 0,
  hoverLift = true,
  ...props
}: AnimatedPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.38, delay, ease: [0.21, 1, 0.31, 1] }}
      whileHover={
        hoverLift
          ? {
              y: -6,
              scale: 1.01,
              transition: { duration: 0.2, ease: "easeOut" },
            }
          : undefined
      }
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}