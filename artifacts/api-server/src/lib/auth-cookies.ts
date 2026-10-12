import type { Response } from "express";
import type { Session } from "@supabase/supabase-js";

export const ACCESS_COOKIE = "mimi_auth_access";
export const REFRESH_COOKIE = "mimi_auth_refresh";
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export function setSessionCookies(res: Response, session: Session) {
  const options = cookieOptions();
  res.cookie(ACCESS_COOKIE, session.access_token, {
    ...options,
    maxAge: Math.max(session.expires_in * 1000, 60 * 1000),
  });
  res.cookie(REFRESH_COOKIE, session.refresh_token, {
    ...options,
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

export function clearSessionCookies(res: Response) {
  const options = cookieOptions();
  res.clearCookie(ACCESS_COOKIE, options);
  res.clearCookie(REFRESH_COOKIE, options);
}
