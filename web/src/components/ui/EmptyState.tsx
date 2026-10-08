import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-none border border-solid border-border/50 bg-background/50 my-4",
        className
      )}
    >
      {icon && (
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-card text-muted-foreground mb-3 ring-1 ring-border/50">
          {icon}
        </div>
      )}
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant="default" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
