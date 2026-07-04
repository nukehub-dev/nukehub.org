interface ThemedImageProps {
  lightSrc: string;
  darkSrc?: string;
  alt: string;
  className?: string;
  width?: string;
  height?: string;
  loading?: "lazy" | "eager";
}

export function ThemedImage({
  lightSrc,
  darkSrc,
  alt,
  className,
  width,
  height,
  loading = "lazy",
}: ThemedImageProps) {
  if (!darkSrc || darkSrc === lightSrc) {
    return (
      <img
        src={lightSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={loading}
      />
    );
  }

  return (
    <>
      <img
        src={lightSrc}
        alt={alt}
        width={width}
        height={height}
        className={`block dark:hidden ${className ?? ""}`}
        loading={loading}
      />
      <img
        src={darkSrc}
        alt={alt}
        width={width}
        height={height}
        className={`hidden dark:block ${className ?? ""}`}
        loading={loading}
      />
    </>
  );
}