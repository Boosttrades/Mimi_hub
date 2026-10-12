import type { NextFunction, Request, Response } from "express";
import type { User as AuthUser } from "@supabase/supabase-js";
import { createAuthClient } from "./auth";
import { clearSessionCookies, setSessionCookies, ACCESS_COOKIE, REFRESH_COOKIE } from "./auth-cookies";
import { ensureAppUser } from "./app-user";
import type { User as AppUser } from "@workspace/db";

export type MimiAuthenticatedRequest = Request & { mimiUser?: AppUser };

async function getVerifiedAuthUser(req: Request, res: Response): Promise<AuthUser | null> {
  const accessToken = req.cookies?.[ACCESS_COOKIE];
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  const auth = createAuthClient();

  if (accessToken) {
    const { data } = await auth.auth.getUser(accessToken);
    if (data.user?.email_confirmed_at) return data.user;
  }

  if (refreshToken) {
    const { data, error } = await auth.auth.refreshSession({ refresh_token: refreshToken });
    if (!error && data.user?.email_confirmed_at && data.session) {
      setSessionCookies(res, data.session);
      return data.user;
    }
  }

  if (accessToken || refreshToken) clearSessionCookies(res);
  return null;
}

export async function resolveAppUser(req: Request, res: Response): Promise<AppUser | null> {
  const authUser = await getVerifiedAuthUser(req, res);
  if (!authUser) return null;
  return ensureAppUser(authUser);
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const appUser = await resolveAppUser(req, res);
    if (!appUser) {
      res.status(401).json({
        error: { code: "NOT_AUTHENTICATED", message: "Please sign in with a verified email." },
      });
      return;
    }
    (req as MimiAuthenticatedRequest).mimiUser = appUser;
    next();
  } catch (error) {
    req.log?.error({ err: error }, "Could not resolve authenticated MimiiHub user");
    res.status(503).json({ error: { code: "PROFILE_UNAVAILABLE", message: "Your account could not be loaded." } });
  }
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const appUser = await resolveAppUser(req, res);
    if (!appUser) {
      res.status(401).json({
        error: { code: "NOT_AUTHENTICATED", message: "Please sign in with a verified email." },
      });
      return;
    }
    if (appUser.role !== "admin") {
      res.status(403).json({
        error: { code: "ADMIN_REQUIRED", message: "This action is for store administrators." },
      });
      return;
    }
    (req as MimiAuthenticatedRequest).mimiUser = appUser;
    next();
  } catch (error) {
    req.log?.error({ err: error }, "Could not authorize MimiiHub administrator");
    res.status(503).json({ error: { code: "PROFILE_UNAVAILABLE", message: "Your account could not be loaded." } });
  }
}

export async function resolveOptionalAppUser(req: Request, res: Response): Promise<AppUser | null> {
  return resolveAppUser(req, res);
}
