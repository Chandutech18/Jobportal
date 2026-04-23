const trimSlash = (value = "") => value.replace(/\/+$/, "");

export const API = trimSlash(process.env.REACT_APP_API_URL || "http://localhost:5000");
export const SOCKET_URL = trimSlash(process.env.REACT_APP_SOCKET_URL || API);
