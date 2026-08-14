import type { Request, Response } from "express";
import type { Session, User } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabase";

export const ACCESS_TOKEN_COOKIE = "mimihub_access_token";
export const REFRESH_TOKEN_COOKIE = "mimihub_refresh_token";

const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function setAuthCookies(res: Response, session: Session): void {
  const accessMaxAge = Math.max(60, session.expires_in) * 1000;

  res.cookie(
    ACCESS_TOKEN_COOKIE,
    session.access_token,
    cookieOptions(accessMaxAge),
  );
  res.cookie(
    REFRESH_TOKEN_COOKIE,
    session.refresh_token,
    cookieOptions(REFRESH_COOKIE_MAX_AGE),
  );
}

export function clearAuthCookies(res: Response): void {
  const options = cookieOptions(0);
  res.clearCookie(ACCESS_TOKEN_COOKIE, options);
  res.clearCookie(REFRESH_TOKEN_COOKIE, options);
}

function bearerToken(req: Request): string | undefined {
  const authorization = req.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return undefined;

  const token = authorization.slice("Bearer ".length).trim();
  return token || undefined;
}

export function authUserResponse(user: User) {
  return {
    id: user.id,
    email: user.email ?? null,
    emailVerified: Boolean(user.email_confirmed_at),
    createdAt: user.created_at,
  };
}

/**
 * Resolve the current Supabase user from a bearer token or the HttpOnly
 * session cookie. If the short-lived access token has expired, the refresh
 * cookie is exchanged and both cookies are rotated.
 */
export async function resolveAuthUser(
  req: Request,
  res: Response,
): Promise<User | null> {
  const accessToken =
    bearerToken(req) ?? req.cookies?.[ACCESS_TOKEN_COOKIE];

  if (accessToken) {
    const { data } = await supabaseAdmin.auth.getUser(accessToken);
    if (data.user) return data.user;
  }

  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
  if (!refreshToken) {
    clearAuthCookies(res);
    return null;
  }

  const { data, error } = await supabaseAdmin.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.user || !data.session) {
    clearAuthCookies(res);
    return null;
  }

  setAuthCookies(res, data.session);
  return data.user;
}

export function authErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("email not confirmed")) {
    return {
      status: 403,
      body: {
        error: "Please verify your email address before signing in.",
        code: "EMAIL_NOT_VERIFIED",
      },
    };
  }

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return {
      status: 401,
      body: {
        error: "Invalid email or password.",
        code: "INVALID_CREDENTIALS",
      },
    };
  }

  if (
    normalized.includes("already registered") ||
    normalized.includes("already exists")
  ) {
    return {
      status: 409,
      body: {
        error: "An account with this email already exists.",
        code: "ACCOUNT_EXISTS",
      },
    };
  }

  if (
    normalized.includes("rate limit") ||
    normalized.includes("too many requests")
  ) {
    return {
      status: 429,
      body: {
        error: "Too many authentication attempts. Please try again later.",
        code: "AUTH_RATE_LIMITED",
      },
    };
  }

  if (
    normalized.includes("invalid email") ||
    normalized.includes("password should be") ||
    normalized.includes("password must")
  ) {
    return {
      status: 400,
      body: {
        error: "Use a valid email address and a password with at least 8 characters.",
        code: "INVALID_AUTH_INPUT",
      },
    };
  }

  return {
    status: 502,
    body: {
      error: "Authentication service is temporarily unavailable.",
      code: "AUTH_SERVICE_UNAVAILABLE",
    },
  };
}