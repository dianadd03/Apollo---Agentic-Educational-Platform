export function resolveMaterialUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";
  const backendOrigin = apiBase || `${window.location.protocol}//${window.location.hostname}:8000`;

  if (url.startsWith("/uploads/")) {
    return `${backendOrigin}${url}`;
  }

  if (url.startsWith("/")) {
    return url;
  }

  const normalized = url.replace(/\\/g, "/");
  const fileName = normalized.split("/").filter(Boolean).pop();
  return fileName ? `${backendOrigin}/uploads/${fileName}` : "";
}
