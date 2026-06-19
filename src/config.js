const trimSlash = (value = "") => value.replace(/\/+$/, "");
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
const VERCEL_HOST_RE = /(^|\.)vercel\.app$/i;
const MISSING_API_URL = "https://api-url-not-configured.invalid";

const isLanHost = (hostname = "") =>
  /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname) || /\.local$/i.test(hostname);

const normalizeHost = (hostname = "") => hostname.replace(/^\[|\]$/g, "");
const isLocalLikeHost = (hostname = "") => {
  const normalized = normalizeHost(hostname);
  return LOCAL_HOSTS.has(normalized) || isLanHost(normalized);
};

const isVercelHost = (hostname = "") => VERCEL_HOST_RE.test(normalizeHost(hostname));

const deriveApiBaseForHost = (hostname = "", protocol = "http:") => {
  const normalizedHost = normalizeHost(hostname);
  if (LOCAL_HOSTS.has(normalizedHost)) {
    return "http://localhost:5000";
  }

  const safeProtocol = protocol === "https:" && !isLanHost(normalizedHost) ? "https:" : "http:";
  return `${safeProtocol}//${normalizedHost}:5000`;
};

const resolveLocalApiBase = () => {
  if (typeof window === "undefined") return "http://localhost:5000";

  const { protocol, hostname } = window.location;
  return deriveApiBaseForHost(hostname, protocol);
};

const resolveApiBase = () => {
  const envApi = trimSlash(process.env.REACT_APP_API_URL || "");
  if (!envApi) {
    if (typeof window !== "undefined" && isVercelHost(window.location.hostname)) {
      return MISSING_API_URL;
    }

    return resolveLocalApiBase();
  }

  if (typeof window === "undefined") return envApi;

  try {
    const envUrl = new URL(envApi);
    const pageHost = normalizeHost(window.location.hostname);
    const envHost = normalizeHost(envUrl.hostname);

    // For local/LAN dev, follow the host that served the React app instead of a stale .env override.
    if (isLocalLikeHost(pageHost) && isLocalLikeHost(envHost)) {
      return deriveApiBaseForHost(pageHost, window.location.protocol);
    }
  } catch {
    return envApi;
  }

  return envApi;
};

const deriveAppUrl = (apiBase) => {
  if (!apiBase) {
    if (typeof window === "undefined") return "http://localhost:3000";
    return trimSlash(window.location.origin);
  }

  try {
    const url = new URL(apiBase);
    url.port = url.port === "5000" ? "3000" : url.port || "3000";
    return trimSlash(url.toString());
  } catch {
    if (typeof window === "undefined") return "http://localhost:3000";
    return trimSlash(window.location.origin);
  }
};

export const API = trimSlash(resolveApiBase());
export const SOCKET_URL = trimSlash(
  process.env.REACT_APP_SOCKET_URL || resolveApiBase()
);
export const APP_URL = trimSlash(process.env.REACT_APP_APP_URL || deriveAppUrl(API));
export const IS_API_CONFIGURED = API !== MISSING_API_URL;

export const getServerReachabilityHelp = (apiBase = API) => {
  if (!apiBase || apiBase === MISSING_API_URL) {
    return "Backend URL is not configured. Deploy the Express server publicly, then set REACT_APP_API_URL in Vercel to that backend URL and redeploy the frontend.";
  }

  if (typeof window !== "undefined" && isVercelHost(window.location.hostname)) {
    return `Cannot reach the deployed backend at ${apiBase}. Make sure the backend is running publicly, CORS allows ${APP_URL}, and REACT_APP_API_URL in Vercel points to the backend URL.`;
  }

  return `Cannot reach the server at ${apiBase}. Open the React app at ${APP_URL}. If you are testing on mobile, use your computer IP on port 3000 for the app and keep the backend reachable on port 5000. Also make sure Windows allows inbound traffic on ports 3000 and 5000.`;
};
