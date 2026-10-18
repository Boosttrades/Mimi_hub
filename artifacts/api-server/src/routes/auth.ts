import { Router, type IRouter } from "express";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import {
  createAuthClient,
  serializeAuthUser,
  serializeSession,
} from "../lib/auth";
import {
  clearSessionCookies,
  setSessionCookies,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
} from "../lib/auth-cookies";
import { ensureAppUser, serializeAppUser } from "../lib/app-user";

const router: IRouter = Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthRequest = {
  email?: unknown;
  phone?: unknown;
  identifier?: unknown;
  token?: unknown;
  password?: unknown;
  fullName?: unknown;
  tokenHash?: unknown;
  redirectTo?: unknown;
  accessToken?: unknown;
  refreshToken?: unknown;
};

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email && email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const phone = value.trim().replace(/[\\s().-]/g, '');
  return /^\\+[1-9]\\d{7,14}$/.test(phone) ? phone : null;
}

function readPassword(value: unknown): string | null {
  return typeof value === "string" && value.length >= 8 && value.length <= 72 ? value : null;
}

function authRedirect(req: Parameters<Parameters<IRouter["post"]>[1]>[0], value: unknown): string | undefined {
  if (process.env.SUPABASE_AUTH_REDIRECT_URL) return process.env.SUPABASE_AUTH_REDIRECT_URL;
  if (typeof value !== "string") return undefined;

  const requestOrigin = req.get("origin");
  if (!requestOrigin) return undefined;
  try {
    const origin = new URL(requestOrigin);
    const target = new URL(value);
    if (
      target.origin !== origin.origin ||
      !target.pathname.endsWith("/account/verify") ||
      target.search ||
      target.hash
    ) {
      return undefined;
    }
    return target.toString();
  } catch {
    return undefined;
  }
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

function authSuccess(user: User, session?: Session | null, appUser?: ReturnType<typeof serializeAppUser>) {
  return {
    user: serializeAuthUser(user),
    authenticated: Boolean(session),
    ...(appUser ? { profile: appUser } : {}),
    ...(session ? { session: serializeSession(session) } : {}),
  };
}

router.post("/auth/signup", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as AuthRequest;
  const email = body.email === undefined || body.email === null || body.email === "" ? null : normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);
  const password = readPassword(body.password);
  const fullName = body.fullName === undefined ? undefined : body.fullName;
  const redirectTo = authRedirect(req, body.redirectTo);

  if (!phone) {
    sendValidationError(res, "Enter a valid phone number in international format, such as +2348012345678.");
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
  if (body.redirectTo !== undefined && !redirectTo) {
    sendValidationError(res, "The verification link must point to this MimiiHub site.");
    return;
  }

  if (body.email !== undefined && body.email !== null && body.email !== "" && !email) {
    sendValidationError(res, "Enter a valid email address or leave it blank.");
    return;
  }
  const { data, error } = await createAuthClient().auth.signUp({
    phone,
    password,
    options: {
      data: { ...(fullName ? { full_name: fullName.trim() } : {}), ...(email ? { contact_email: email } : {}) },
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

  const verified = Boolean(data.user.phone_confirmed_at);
  let profile: ReturnType<typeof serializeAppUser> | undefined;
  if (data.session && verified) {
    const appUser = await ensureAppUser(data.user);
    profile = serializeAppUser(appUser, data.user);
    setSessionCookies(res, data.session);
  }
  res.status(201).json({
    ...authSuccess(data.user, data.session && verified ? data.session : null, profile),
    requiresPhoneVerification: !verified,
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as AuthRequest;
  const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
  const email = normalizeEmail(identifier);
  const phone = normalizePhone(identifier);
  const password = readPassword(body.password);

  if ((!email && !phone) || !password) {
    sendValidationError(res, "Enter a valid phone number or email address and your password.");
    return;
  }

  const { data, error } = await createAuthClient().auth.signInWithPassword({
    ...(email ? { email } : { phone: phone! }),
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

  if (!data.user.email_confirmed_at) {
    res.status(403).json({
      error: {
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email before signing in.",
      },
    });
    return;
  }

  const appUser = await ensureAppUser(data.user);
  setSessionCookies(res, data.session);
  res.json(authSuccess(data.user, data.session, serializeAppUser(appUser, data.user)));
});

router.post("/auth/verify-phone", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as AuthRequest;
  const phone = normalizePhone(body.phone);
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!phone || !/^\\d{4,8}$/.test(token)) {
    sendValidationError(res, "Enter a valid phone number and SMS verification code.");
    return;
  }
  const { data, error } = await createAuthClient().auth.verifyOtp({ phone, token, type: "sms" });
  if (error) {
    sendAuthError(req, res, error, "Could not verify your phone number.");
    return;
  }
  if (!data.user || !data.session || !data.user.phone_confirmed_at) {
    res.status(403).json({ error: { code: "PHONE_NOT_VERIFIED", message: "Phone verification was not completed." } });
    return;
  }
  const appUser = await ensureAppUser(data.user);
  setSessionCookies(res, data.session);
  res.json(authSuccess(data.user, data.session, serializeAppUser(appUser, data.user)));
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
  const redirectTo = authRedirect(req, body.redirectTo);

  if (!email) {
    sendValidationError(res, "A valid email address is required.");
    return;
  }
  if (body.redirectTo !== undefined && !redirectTo) {
    sendValidationError(res, "The verification link must point to this MimiiHub site.");
    return;
  }

  const { error } = await createAuthClient().auth.resend({
    type: "signup",
    email,
    ...(redirectTo ? { options: { emailRedirectTo: redirectTo } } : {}),
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

  let profile: ReturnType<typeof serializeAppUser> | undefined;
  if (data.session && data.user.email_confirmed_at) {
    const appUser = await ensureAppUser(data.user);
    profile = serializeAppUser(appUser, data.user);
    setSessionCookies(res, data.session);
  }
  res.json({
    ...authSuccess(data.user, data.session, profile),
    verified: true,
    requiresEmailVerification: !data.user.email_confirmed_at,
  });
});

// Supabase's built-in confirmation link may redirect back with implicit-flow
// tokens in the URL fragment. Exchange those once for server-only HttpOnly
// cookies, then the browser removes the fragment immediately.
router.post("/auth/accept-session", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as AuthRequest;
  if (
    typeof body.accessToken !== "string" ||
    typeof body.refreshToken !== "string" ||
    body.accessToken.length > 8192 ||
    body.refreshToken.length > 8192
  ) {
    sendValidationError(res, "The verification session is invalid or incomplete.");
    return;
  }

  const { data, error } = await createAuthClient().auth.setSession({
    access_token: body.accessToken,
    refresh_token: body.refreshToken,
  });
  if (error || !data.user || !data.session || !data.user.email_confirmed_at) {
    if (error) sendAuthError(req, res, error, "Could not complete email verification.");
    else {
      res.status(403).json({
        error: { code: "EMAIL_NOT_VERIFIED", message: "Please verify your email before signing in." },
      });
    }
    return;
  }

  const appUser = await ensureAppUser(data.user);
  setSessionCookies(res, data.session);
  res.json(authSuccess(data.user, data.session, serializeAppUser(appUser, data.user)));
});

export default router;