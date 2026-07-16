import { useCountUp } from "@lib/useCountUp";
import { getIcon } from "@lib/icons";

interface HeroStatCardProps {
  iconName: string;
  label: string;
  value: string;
  numericValue?: number;
  index?: number;
}

function renderIcon(iconName: string) {
  const Icon = getIcon(iconName);
  if (!Icon) return null;
  return <Icon className="h-4 w-4 sm:h-5 sm:w-5" />;
}

export function HeroStatCard({
  iconName,
  label,
  value,
  numericValue,
  index = 0,
}: HeroStatCardProps) {
  const suffix =
    numericValue !== undefined ? value.replace(String(numericValue), "") : "";
  const { displayValue, ref } = useCountUp(numericValue || 0, 1.5, suffix);
  const isNumeric = numericValue !== undefined;

  return (
    <div
      ref={ref}
      className="bubble hover-lift group grid grid-cols-[auto_1fr_auto] items-center gap-2 px-2 py-3 sm:gap-4 sm:px-5 sm:py-4 animate-float-gentle"
      style={{ animationDelay: `${index * 0.5}s` }}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15 group-hover:scale-110 sm:h-10 sm:w-10">
        {renderIcon(iconName)}
      </div>
      <div className="min-w-0 text-center">
        <div className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
          {isNumeric ? displayValue : value}
        </div>
        <div className="text-[10px] font-medium leading-tight text-muted-foreground sm:text-xs">
          {label}
        </div>
      </div>
      <div className="w-8 sm:w-10" aria-hidden="true" />
    </div>
  );
}
