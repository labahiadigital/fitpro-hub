import { Image, type ImageProps, Skeleton } from "@mantine/core";
import { usePresignedUrl } from "../../hooks/usePresignedUrl";

interface R2ImageProps extends Omit<ImageProps, "src"> {
  src: string | null | undefined;
  fallback?: string;
}

export function R2Image({ src, fallback, ...rest }: R2ImageProps) {
  const resolved = usePresignedUrl(src);

  if (src && !resolved) {
    return <Skeleton w={rest.w ?? 40} h={rest.h ?? 40} radius={rest.radius} />;
  }

  return <Image src={resolved ?? fallback ?? undefined} {...rest} />;
}
