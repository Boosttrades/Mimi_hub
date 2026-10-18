import { Router, type IRouter, type Request, type RequestHandler, type Response } from "express";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { supabaseAdmin, PRODUCT_IMAGES_BUCKET } from "../lib/supabase";
import { requireAdmin } from "../lib/request-auth";

const router: IRouter = Router();
const allowedCategoryImageTypes = new Set(["image/jpeg", "image/png"]);
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, file.mimetype.startsWith("image/"));
  },
});

const handleUpload: RequestHandler = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (error) {
      const tooLarge = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
      res.status(tooLarge ? 413 : 400).json({
        error: tooLarge
          ? "Image must be 10 MB or smaller."
          : "Only image files are accepted.",
      });
      return;
    }
    next();
  });
};

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

async function saveImageUpload(req: Request, res: Response, categoryImage: boolean): Promise<void> {
  const file = req.file;
  if (!file) {
    res.status(400).json({
      error: categoryImage
        ? "Choose a JPEG or PNG image no larger than 10 MB."
        : "An image file is required",
    });
    return;
  }

  if (categoryImage) {
    const validPng = file.mimetype === "image/png" && file.buffer.subarray(0, 8).equals(pngSignature);
    const validJpeg =
      file.mimetype === "image/jpeg" &&
      file.buffer.length >= 3 &&
      file.buffer[0] === 0xff &&
      file.buffer[1] === 0xd8 &&
      file.buffer[2] === 0xff;
    if (!allowedCategoryImageTypes.has(file.mimetype) || (!validPng && !validJpeg)) {
      res.status(400).json({ error: "Choose a valid JPEG or PNG image." });
      return;
    }
  }

  try {
    await ensureProductImagesBucket();
    const extension = categoryImage
      ? file.mimetype === "image/png" ? ".png" : ".jpg"
      : path.extname(file.originalname).toLowerCase() || ".bin";
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
}

router.post("/storage/upload", requireAdmin, handleUpload, async (req, res): Promise<void> => {
  await saveImageUpload(req, res, false);
});

router.post("/storage/upload/category-image", requireAdmin, handleUpload, async (req, res): Promise<void> => {
  await saveImageUpload(req, res, true);
});

export default router;