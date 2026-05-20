import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@lib/utils';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  className,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-lg border border-border/60 bg-background/80 pl-9 pr-4 py-2',
          'text-sm text-foreground placeholder:text-muted-foreground/70',
          'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40',
          'transition-colors'
        )}
        {...props}
      />
      {value && onClear && (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground hover:text-foreground uppercase tracking-wide"
          type="button"
        >
          Clear
        </button>
      )}
    </div>
  );
}
