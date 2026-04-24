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

export const API = trimSlash(process.env.REACT_APP_API_URL || resolveLocalApiBase());
export const SOCKET_URL = trimSlash(process.env.REACT_APP_SOCKET_URL || API);
