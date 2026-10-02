import { randomUUID } from "node:crypto";
import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { env } from "../../config/env.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { asyncHandler, HttpError } from "../../utils/http.js";

export const storageRouter = Router();
storageRouter.use(requireAuth);

const allowedMime = new Set(["image/jpeg", "image/png", "image/webp"]);

storageRouter.post(
  "/signed-upload",
  asyncHandler(async (req, res) => {
    const contentType = String(req.body.contentType ?? "");
    if (!allowedMime.has(contentType))
      throw new HttpError(
        400,
        "INVALID_FILE_TYPE",
        "Only JPEG, PNG and WebP images are supported",
      );
    const kind = req.body.kind === "service" ? "service" : "citizen";
    const ownerId = String(req.body.ownerId ?? "unassigned").replace(
      /[^a-zA-Z0-9_-]/g,
      "",
    );
    const extension =
      contentType === "image/webp"
        ? "webp"
        : contentType === "image/png"
          ? "png"
          : "jpg";
    const path = `${kind}/${ownerId}/${Date.now()}-${randomUUID()}.${extension}`;
    const { data, error } = await supabaseAdmin.storage
      .from(env.supabaseBucket)
      .createSignedUploadUrl(path);
    if (error || !data)
      throw new HttpError(
        500,
        "STORAGE_SIGN_FAILED",
        error?.message ?? "Unable to create upload URL",
      );
    const { data: publicData } = supabaseAdmin.storage
      .from(env.supabaseBucket)
      .getPublicUrl(path);
    res.json({
      success: true,
      data: {
        bucket: env.supabaseBucket,
        path,
        token: data.token,
        publicUrl: publicData.publicUrl,
      },
    });
  }),
);
