import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@lib/utils";

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Text to show as initials fallback if the image fails to load. */
  fallback?: string;
  /** Optional wrapper className. */
  wrapperClassName?: string;
  /** Aspect ratio container or not. */
  aspect?: "square" | "video" | "portrait" | "auto";
  /** Rounded style. */
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "full";
}

export function Image({
  src,
  alt,
  fallback,
  wrapperClassName,
  className,
  aspect = "auto",
  rounded = "lg",
  ...imgProps
}: ImageProps) {
  const [status, setStatus] = React.useState<"loading" | "loaded" | "error">(
    () => (!src ? "error" : "loading"),
  );
  const imgRef = React.useRef<HTMLImageElement>(null);
  const initial =
    fallback?.charAt(0).toUpperCase() || alt?.charAt(0).toUpperCase() || "?";

  // If the image is already cached and valid, skip the shimmer entirely.
  // Must check naturalWidth > 0 to avoid treating broken/missing images as loaded.
  React.useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete) {
      if (img.naturalWidth > 0) {
        setStatus("loaded");
      } else {
        setStatus("error");
      }
    }
  }, [src]);

  const aspectClass = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
    auto: "",
  };

  const roundedClass = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    full: "rounded-full",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        aspectClass[aspect],
        roundedClass[rounded],
        wrapperClassName,
      )}
    >
      {/* Shimmer placeholder — only shown when truly loading */}
      <AnimatePresence>
        {status === "loading" && (
          <motion.div
            key="shimmer"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "absolute inset-0 z-10",
              "bg-gradient-to-r from-muted via-muted-foreground/10 to-muted",
              "bg-[length:200%_100%]",
              "animate-shimmer",
            )}
          />
        )}
      </AnimatePresence>

      {/* Actual image */}
      {status !== "error" && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={imgProps.width ?? "100%"}
          height={imgProps.height ?? "100%"}
          loading={imgProps.loading ?? "lazy"}
          decoding={imgProps.decoding ?? "async"}
          className={cn(
            "h-full w-full object-cover",
            status === "loaded" ? "opacity-100" : "opacity-0",
            "transition-opacity duration-300",
            className,
          )}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          {...imgProps}
        />
      )}

      {/* Initials fallback */}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-2xl font-bold text-muted-foreground select-none">
            {initial}
          </span>
        </div>
      )}
    </div>
  );
}
