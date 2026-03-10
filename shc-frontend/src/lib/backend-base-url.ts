const DEFAULT_BACKEND_BASE_URL = "http://127.0.0.1:6969";

export function getBackendBaseUrl() {
  const configuredBaseUrl = process.env.SHC_BACKEND_API_BASE_URL?.trim();
  const rawBaseUrl = configuredBaseUrl || DEFAULT_BACKEND_BASE_URL;

  try {
    const parsedUrl = new URL(rawBaseUrl);

    if (parsedUrl.hostname === "localhost") {
      parsedUrl.hostname = "127.0.0.1";
    }

    return parsedUrl.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_BACKEND_BASE_URL;
  }
}