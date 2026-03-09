import { createError, defineEventHandler } from "h3";

import { buildBenchmarkShareRender } from "../../utils/buildBenchmarkShareHtml";
import { normalizeShareSnapshot } from "../../utils/shareSnapshot";
import { getShareSnapshot } from "../../utils/shareSnapshotStore";

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id || "";
  const snapshot = getShareSnapshot(id);
  if (!snapshot) {
    throw createError({
      statusCode: 404,
      statusMessage: "Snapshot not found"
    });
  }

  return buildBenchmarkShareRender(normalizeShareSnapshot(snapshot));
});
