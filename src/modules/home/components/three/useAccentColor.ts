import { useState, useEffect } from 'react';
import { getPrimaryColor, watchPrimaryColor } from '@lib/themeColors';

/**
 * React hook that returns the current accent color as a hex string
 * and re-renders when the user changes theme or accent.
 */
export function useAccentColor(): string {
  const [color, setColor] = useState(() => getPrimaryColor());

  useEffect(() => {
    return watchPrimaryColor(setColor);
  }, []);

  return color;
}
