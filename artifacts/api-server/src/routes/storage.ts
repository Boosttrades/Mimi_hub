import { Router, type IRouter } from "express";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { supabaseAdmin, PRODUCT_IMAGES_BUCKET } from "../lib/supabase";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, file.mimetype.startsWith("image/"));
  },
});

let bucketReady: Promise<void> | undefined;

async function ensureProductImagesBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { data } = await supabaseAdmin.storage.getBucket(PRODUCT_IMAGES_BUCKET);
      if (data) return;

      const { error } = await supabaseAdmin.storage.createBucket(PRODUCT_IMAGES_BUCKET, {
        public: true,
        fileSizeLimit: "10MB",
        allowedMimeTypes: ["image/*"],
      });
      if (error && !/already exists/i.test(error.message)) {
        throw error;
      }
    })();
  }

  return bucketReady;
}

router.post("/storage/upload", upload.single("file"), async (req, res): Promise<void> => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "An image file is required" });
    return;
  }

  try {
    await ensureProductImagesBucket();
    const extension = path.extname(file.originalname).toLowerCase() || ".bin";
    const objectPath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${extension}`;
    const { error } = await supabaseAdmin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: "31536000",
        upsert: false,
      });

    if (error) {
      req.log.error({ err: error }, "Supabase Storage upload failed");
      res.status(502).json({ error: "Could not upload image to Supabase Storage" });
      return;
    }

    const { data } = supabaseAdmin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(objectPath);

    res.status(201).json({ path: objectPath, url: data.publicUrl });
  } catch (error) {
    req.log.error({ err: error }, "Supabase Storage setup failed");
    res.status(502).json({ error: "Supabase Storage is unavailable" });
  }
});

export default router;