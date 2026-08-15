import { Router, type IRouter } from "express";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import {
  createAuthClient,
  serializeAuthUser,
  serializeSession,
} from "../lib/auth";

const router: IRouter = Router();

const ACCESS_COOKIE = "mimi_auth_access";
const REFRESH_COOKIE = "mimi_auth_refresh";
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthRequest = {
  email?: unknown;
  password?: unknown;
  fullName?: unknown;
  tokenHash?: unknown;
};

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

function setSessionCookies(
  res: Parameters<Parameters<IRouter["post"]>[1]>[1],
  session: Session,
) {
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

function clearSessionCookies(
  res: Parameters<Parameters<IRouter["post"]>[1]>[1],
) {
  const options = cookieOptions();
  res.clearCookie(ACCESS_COOKIE, options);
  res.clearCookie(REFRESH_COOKIE, options);
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email && email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
}

function readPassword(value: unknown): string | null {
  return typeof value === "string" && value.length >= 8 && value.length <= 72 ? value : null;
}

function authErrorStatus(error: AuthError): number {
  const message = error.message.toLowerCase();
  const code = error.code?.toLowerCase() ?? "";

  if (error.status === 429 || code.includes("rate") || message.includes("rate limit")) return 429;
  if (message.includes("already registered") || message.includes("already exists")) return 409;
  if (message.includes("email not confirmed") || code.includes("email_not_confirmed")) return 403;
  if (message.includes("invalid login credentials") || code.includes("invalid_credentials")) return 401;
  if (error.status && error.status >= 400 && error.status < 500) return error.status;
  return 502;
}

function authErrorCode(error: AuthError): string {
  const message = error.message.toLowerCase();
  const code = error.code?.toLowerCase() ?? "";

  if (message.includes("already registered") || message.includes("already exists")) return "EMAIL_ALREADY_REGISTERED";
  if (message.includes("email not confirmed") || code.includes("email_not_confirmed")) return "EMAIL_NOT_VERIFIED";
  if (message.includes("invalid login credentials") || code.includes("invalid_credentials")) return "INVALID_CREDENTIALS";
  if (error.status === 429 || code.includes("rate") || message.includes("rate limit")) return "RATE_LIMITED";
  return "AUTH_PROVIDER_ERROR";
}

function sendAuthError(req: Parameters<Parameters<IRouter["post"]>[1]>[0], res: Parameters<Parameters<IRouter["post"]>[1]>[1], error: AuthError, fallbackMessage = "Authentication failed") {
  const status = authErrorStatus(error);
  const message =
    status === 401 ? "The email or password is incorrect." :
    status === 403 ? "Please verify your email before signing in." :
    status === 409 ? "An account with this email already exists." :
    status === 429 ? "Too many authentication attempts. Please try again later." :
    fallbackMessage;

  req.log.warn({ status, code: authErrorCode(error) }, "Supabase authentication request failed");
  res.status(status).json({
    error: {
      code: authErrorCode(error),
      message,
    },
  });
}

function sendValidationError(
  res: Parameters<Parameters<IRouter["post"]>[1]>[1],
  message: string,
) {
  res.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message,
    },
  });
}

async function getCurrentUser(accessToken: string): Promise<{ user: User | null; error: AuthError | null }> {
  const { data, error } = await createAuthClient().auth.getUser(accessToken);
  return { user: data.user, error };
}

function authSuccess(user: User, session?: Session | null) {
  return {
    user: serializeAuthUser(user),
    authenticated: Boolean(session),
    ...(session ? { session: serializeSession(session) } : {}),
  };
}

router.post("/auth/signup", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as AuthRequest;
  const email = normalizeEmail(body.email);
  const password = readPassword(body.password);
  const fullName = body.fullName === undefined ? undefined : body.fullName;

  if (!email) {
    sendValidationError(res, "A valid email address is required.");
    return;
  }
  if (!password) {
    sendValidationError(res, "Password must be between 8 and 72 characters.");
    return;
  }
  if (fullName !== undefined && (typeof fullName !== "string" || fullName.trim().length > 120)) {
    sendValidationError(res, "Full name must be a string of 120 characters or fewer.");
    return;
  }

  const { data, error } = await createAuthClient().auth.signUp({
    email,
    password,
    options: {
      ...(fullName ? { data: { full_name: fullName.trim() } } : {}),
      ...(process.env.SUPABASE_AUTH_REDIRECT_URL
        ? { emailRedirectTo: process.env.SUPABASE_AUTH_REDIRECT_URL }
        : {}),
    },
  });

  if (error) {
    sendAuthError(req, res, error, "Could not create your account.");
    return;
  }
  if (!data.user) {
    res.status(502).json({
      error: {
        code: "AUTH_PROVIDER_ERROR",
        message: "The authentication service did not return an account.",
      },
    });
    return;
  }

  // Supabase can intentionally return an empty identity list for an existing
  // email to avoid account enumeration when email confirmation is enabled.
  if (!data.session && data.user.identities?.length === 0) {
    res.status(409).json({
      error: {
        code: "EMAIL_ALREADY_REGISTERED",
        message: "An account with this email already exists.",
      },
    });
    return;
  }

  if (data.session) setSessionCookies(res, data.session);
  res.status(201).json({
    ...authSuccess(data.user, data.session),
    requiresEmailVerification: !data.session,
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as AuthRequest;
  const email = normalizeEmail(body.email);
  const password = readPassword(body.password);

  if (!email || !password) {
    sendValidationError(res, "A valid email and password are required.");
    return;
  }

  const { data, error } = await createAuthClient().auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    sendAuthError(req, res, error, "Could not sign you in.");
    return;
  }
  if (!data.user || !data.session) {
    res.status(502).json({
      error: {
        code: "AUTH_PROVIDER_ERROR",
        message: "The authentication service did not return a session.",
      },
    });
    return;
  }

  setSessionCookies(res, data.session);
  res.json(authSuccess(data.user, data.session));
});

router.post("/auth/logout", (req, res): void => {
  clearSessionCookies(res);
  req.log.info("Cleared authentication session");
  res.status(204).send();
});

router.get("/auth/session", async (req, res): Promise<void> => {
  const accessToken = req.cookies?.[ACCESS_COOKIE];
  const refreshToken = req.cookies?.[REFRESH_COOKIE];

  if (!accessToken && !refreshToken) {
    res.status(401).json({
      error: { code: "NOT_AUTHENTICATED", message: "No active session." },
    });
    return;
  }

  if (accessToken) {
    const current = await getCurrentUser(accessToken);
    if (current.user) {
      res.json(authSuccess(current.user));
      return;
    }
  }

  if (!refreshToken) {
    clearSessionCookies(res);
    res.status(401).json({
      error: { code: "SESSION_EXPIRED", message: "Your session has expired. Please sign in again." },
    });
    return;
  }

  const { data, error } = await createAuthClient().auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (error || !data.user || !data.session) {
    clearSessionCookies(res);
    res.status(401).json({
      error: { code: "SESSION_EXPIRED", message: "Your session has expired. Please sign in again." },
    });
    return;
  }

  setSessionCookies(res, data.session);
  res.json(authSuccess(data.user, data.session));
});

router.post("/auth/resend-verification", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as AuthRequest;
  const email = normalizeEmail(body.email);

  if (!email) {
    sendValidationError(res, "A valid email address is required.");
    return;
  }

  const { error } = await createAuthClient().auth.resend({
    type: "signup",
    email,
    ...(process.env.SUPABASE_AUTH_REDIRECT_URL
      ? { options: { emailRedirectTo: process.env.SUPABASE_AUTH_REDIRECT_URL } }
      : {}),
  });

  if (error) {
    sendAuthError(req, res, error, "Could not resend the verification email.");
    return;
  }

  res.status(202).json({
    message: "If an account needs verification, a new email has been sent.",
  });
});

router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as AuthRequest;
  if (typeof body.tokenHash !== "string" || !body.tokenHash.trim()) {
    sendValidationError(res, "A verification token is required.");
    return;
  }

  const { data, error } = await createAuthClient().auth.verifyOtp({
    type: "signup",
    token_hash: body.tokenHash.trim(),
  });

  if (error) {
    sendAuthError(req, res, error, "Could not verify your email.");
    return;
  }
  if (!data.user) {
    res.status(502).json({
      error: {
        code: "AUTH_PROVIDER_ERROR",
        message: "The authentication service did not return a verified account.",
      },
    });
    return;
  }

  if (data.session) setSessionCookies(res, data.session);
  res.json({
    ...authSuccess(data.user, data.session),
    verified: true,
    requiresEmailVerification: false,
  });
});

export default router;