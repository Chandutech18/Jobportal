const trimSlash = (value = "") => value.replace(/\/+$/, "");
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

const isLanHost = (hostname = "") =>
  /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname) || /\.local$/i.test(hostname);

const resolveLocalApiBase = () => {
  if (typeof window === "undefined") return "http://localhost:5000";

  const { protocol, hostname } = window.location;
  const normalizedHost = hostname.replace(/^\[|\]$/g, "");

  if (LOCAL_HOSTS.has(normalizedHost)) {
    return "http://localhost:5000";
  }

  const safeProtocol = protocol === "https:" && !isLanHost(normalizedHost) ? "https:" : "http:";

  return `${safeProtocol}//${normalizedHost}:5000`;
};

const deriveAppUrl = (apiBase) => {
  try {
    const url = new URL(apiBase);
    url.port = url.port === "5000" ? "3000" : url.port || "3000";
    return trimSlash(url.toString());
  } catch {
    if (typeof window === "undefined") return "http://localhost:3000";
    return trimSlash(window.location.origin);
  }
};

export const API = trimSlash(process.env.REACT_APP_API_URL || resolveLocalApiBase());
export const SOCKET_URL = trimSlash(
  process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL || resolveLocalApiBase()
);
export const APP_URL = trimSlash(process.env.REACT_APP_APP_URL || deriveAppUrl(API));

export const getServerReachabilityHelp = (apiBase = API) =>
  `Cannot reach the server at ${apiBase}. Open the React app at ${APP_URL}. If you are testing on mobile, use your computer IP on port 3000 for the app and keep the backend reachable on port 5000. Also make sure Windows allows inbound traffic on ports 3000 and 5000.`;
