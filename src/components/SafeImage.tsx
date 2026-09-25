"use client";

import { useState, type ImgHTMLAttributes } from "react";
import type { ResponsiveImage } from "@/src/content/schema";

interface SafeImageProps
  extends Omit<
      ImgHTMLAttributes<HTMLImageElement>,
      "src" | "alt" | "width" | "height" | "sizes" | "srcSet"
    >,
    ResponsiveImage {
  fallbackSrc?: string;
}

export function SafeImage({
  src,
  alt,
  width,
  height,
  fallbackSrc = "/assets/core/fallback-poster.svg",
  onError,
  ...props
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      {...props}
      src={failed ? fallbackSrc : src}
      alt={alt}
      width={width}
      height={height}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
