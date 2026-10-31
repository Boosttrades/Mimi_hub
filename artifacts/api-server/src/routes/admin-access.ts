import { Router, type IRouter } from "express";
import { requireAdmin } from "../lib/request-auth";

const router: IRouter = Router();

// Keep the initial sign-in gate lightweight. The dashboard summary is loaded
// separately only after this server-side role check succeeds.
router.get("/admin/access", requireAdmin, (_req, res): void => {
  res.json({ authorized: true });
});

export default router;
