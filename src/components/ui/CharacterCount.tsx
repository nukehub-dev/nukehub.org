import { cn } from "@lib/utils";

export interface CharacterCountProps {
  current: number;
  max?: number;
  className?: string;
}

export function CharacterCount({
  current,
  max,
  className,
}: CharacterCountProps) {
  const overLimit = max !== undefined && current > max;

  if (max === undefined) {
    return (
      <span
        className={cn("tabular-nums text-xs text-muted-foreground", className)}
      >
        {current} character{current === 1 ? "" : "s"}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "tabular-nums text-xs",
        overLimit ? "text-destructive" : "text-muted-foreground",
        className,
      )}
    >
      {current}
      <span className="text-muted-foreground/60"> / {max}</span>
    </span>
  );
}
