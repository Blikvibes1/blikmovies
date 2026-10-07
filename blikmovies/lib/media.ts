export function mediaUrl(path: string | null | undefined, kind: "poster" | "backdrop" = "poster") {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const size = kind === "backdrop" ? "original" : "w500";
  const p = path.startsWith("/") ? path : `/${path}`;
  return `https://image.tmdb.org/t/p/${size}${p}`;
}
