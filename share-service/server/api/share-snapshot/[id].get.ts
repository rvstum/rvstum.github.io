import { createError, defineEventHandler } from "h3";

import { getShareSnapshot } from "../../utils/shareSnapshotStore";

export default defineEventHandler((event) => {
  const id = event.context.params?.id || "";
  const snapshot = getShareSnapshot(id);
  if (!snapshot) {
    throw createError({
      statusCode: 404,
      statusMessage: "Snapshot not found"
    });
  }

  return snapshot;
});
