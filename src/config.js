const trimSlash = (value = "") => value.replace(/\/+$/, "");

const resolveLocalApiBase = () => {
  if (typeof window === "undefined") return "http://localhost:5000";

  const { protocol, hostname } = window.location;
  const safeProtocol = protocol === "https:" ? "https:" : "http:";
  const localHosts = new Set(["localhost", "127.0.0.1"]);
  const resolvedHost = localHosts.has(hostname) ? "localhost" : hostname;

  return `${safeProtocol}//${resolvedHost}:5000`;
};

export const API = trimSlash(process.env.REACT_APP_API_URL || resolveLocalApiBase());
export const SOCKET_URL = trimSlash(process.env.REACT_APP_SOCKET_URL || API);
