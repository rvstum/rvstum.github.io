import { defineEventHandler, getRequestURL, readBody } from "h3";

import { normalizeShareSnapshot } from "../utils/shareSnapshot";
import { saveShareSnapshot } from "../utils/shareSnapshotStore";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const snapshot = normalizeShareSnapshot(body);
  const id = saveShareSnapshot(snapshot);
  const requestUrl = getRequestURL(event);
  const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

  return {
    id,
    imageUrl: `${baseUrl.replace(/\/+$/g, "")}/__og-image__/image/render/og.png?id=${encodeURIComponent(id)}`
  };
});
