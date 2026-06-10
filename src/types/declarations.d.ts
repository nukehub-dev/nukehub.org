declare module "culori" {
  export function oklch(
    color: string,
  ): { l: number; c: number; h: number; alpha?: number } | undefined;
  export function formatHex(
    color: { l: number; c: number; h: number; alpha?: number } | string,
  ): string | undefined;
}
