import { defineEventHandler, getMethod, getRequestURL, setResponseHeader, setResponseStatus } from "h3";

export default defineEventHandler((event) => {
  const { pathname } = getRequestURL(event);
  if (!pathname.startsWith("/api/share-snapshot")) return;

  setResponseHeader(event, "Access-Control-Allow-Origin", "*");
  setResponseHeader(event, "Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  setResponseHeader(event, "Access-Control-Allow-Headers", "Content-Type");
  setResponseHeader(event, "Access-Control-Max-Age", "86400");

  if (getMethod(event) === "OPTIONS") {
    setResponseStatus(event, 204);
    return "";
  }
});
