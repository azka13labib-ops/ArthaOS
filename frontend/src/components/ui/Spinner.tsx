import React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export function Spinner({ size = "md", className, label }: SpinnerProps) {
  const sizeStyles = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-3",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-4">
      <div
        className={cn(
          "animate-spin rounded-full border-slate-200 border-t-emerald-600",
          sizeStyles[size],
          className
        )}
        role="status"
        aria-label="Loading"
      />
      {label && <p className="text-xs text-slate-500">{label}</p>}
    </div>
  );
}
