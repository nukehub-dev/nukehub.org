import { useCountUp } from '@lib/useCountUp';
import { getIcon } from '@lib/icons';

interface HeroStatCardProps {
  iconName: string;
  label: string;
  value: string;
  numericValue?: number;
  index?: number;
}

export function HeroStatCard({ iconName, label, value, numericValue, index = 0 }: HeroStatCardProps) {
  const Icon = getIcon(iconName);
  const suffix = numericValue !== undefined ? value.replace(String(numericValue), '') : '';
  const { displayValue, ref } = useCountUp(numericValue || 0, 1.5, suffix);
  const isNumeric = numericValue !== undefined;

  return (
    <div
      ref={ref}
      className="bubble hover-lift group flex items-center gap-4 px-5 py-4 animate-float-gentle"
      style={{ animationDelay: `${index * 0.5}s` }}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15 group-hover:scale-110">
        {Icon && <Icon className="h-5 w-5" />}
      </div>
      <div>
        <div className="text-lg font-semibold tracking-tight text-foreground">
          {isNumeric ? displayValue : value}
        </div>
        <div className="text-xs font-medium text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}
