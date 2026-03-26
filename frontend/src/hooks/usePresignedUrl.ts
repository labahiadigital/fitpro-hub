import { useQuery } from "@tanstack/react-query";
import { storageApi } from "../services/api";

const R2_MARKERS = ["trackfiz-platform.trackfiz.com", "trackfiz-workspaces.trackfiz.com"];

function isR2Url(url: string | null | undefined): url is string {
  if (!url) return false;
  return R2_MARKERS.some((m) => url.includes(m));
}

/**
 * Resolve a single R2 reference URL to a presigned URL.
 * Returns the original URL immediately if it's not an R2 URL.
 */
export function usePresignedUrl(url: string | null | undefined) {
  const needsPresign = isR2Url(url);

  const { data } = useQuery({
    queryKey: ["presign", url],
    queryFn: async () => {
      const res = await storageApi.presign([url!]);
      return res.data.urls[url!] ?? url!;
    },
    enabled: needsPresign,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  if (!url) return null;
  if (!needsPresign) return url;
  return data ?? null;
}

/**
 * Resolve multiple R2 reference URLs to presigned URLs in a single batch call.
 * Returns a map from original URL → presigned URL.
 */
export function usePresignedUrls(urls: (string | null | undefined)[]) {
  const r2Urls = urls.filter(isR2Url);
  const sortedKey = [...r2Urls].sort().join("|");

  const { data } = useQuery({
    queryKey: ["presign-batch", sortedKey],
    queryFn: async () => {
      const res = await storageApi.presign(r2Urls);
      return res.data.urls;
    },
    enabled: r2Urls.length > 0,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const result: Record<string, string | null> = {};
  for (const url of urls) {
    if (!url) continue;
    if (!isR2Url(url)) {
      result[url] = url;
    } else {
      result[url] = data?.[url] ?? null;
    }
  }
  return result;
}
