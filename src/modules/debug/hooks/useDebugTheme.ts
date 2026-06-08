import { useEffect, useState } from 'react';
import { getPrimaryColor } from '@lib/themeColors';

interface DebugTheme {
  primary: string;
  isLight: boolean;
}

export function useDebugTheme(): DebugTheme {
  const [primary, setPrimary] = useState('#f37524');
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const update = () => {
      setPrimary(getPrimaryColor());
      setIsLight(document.documentElement.getAttribute('data-theme') === 'light');
    };
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-accent', 'data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  return { primary, isLight };
}
