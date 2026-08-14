import { Router, type IRouter } from "express";
import {
  authErrorResponse,
  authUserResponse,
  clearAuthCookies,
  resolveAuthUser,
  setAuthCookies,
} from "../lib/auth";
import { supabaseAdmin } from "../lib/supabase";

const router: IRouter = Router();

type Credentials = {
  email: string;
  password: string;
};

function parseCredentials(body: unknown):
  | { credentials: Credentials }
  | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Email and password are required." };
  }

  const input = body as Record<string, unknown>;
  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (password.length > 128) {
    return { error: "Password must be 128 characters or fewer." };
  }

  return { credentials: { email, password } };
}

function authSuccessResponse(
  user: NonNullable<Awaited<ReturnType<typeof resolveAuthUser>>>,
  emailVerificationRequired = false,
) {
  return {
    user: authUserResponse(user),
    emailVerificationRequired,
  };
}

// POST /auth/signup — create an account and start email verification.
router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = parseCredentials(req.body);
  if ("error" in parsed) {
    res.status(400).json({ error: parsed.error, code: "INVALID_AUTH_INPUT" });
    return;
  }

  const { email, password } = parsed.credentials;
  const { data, error } = await supabaseAdmin.auth.signUp({
    email,
    password,
  });

  if (error) {
    const response = authErrorResponse(error);
    res.status(response.status).json(response.body);
    return;
  }

  if (!data.user) {
    res.status(502).json({
      error: "Authentication service did not create the account.",
      code: "AUTH_SERVICE_UNAVAILABLE",
    });
    return;
  }

  // Supabase returns an empty identities array when sign-up is attempted for
  // an existing account while email confirmation is enabled.
  if (data.user.identities && data.user.identities.length === 0) {
    res.status(409).json({
      error: "An account with this email already exists.",
      code: "ACCOUNT_EXISTS",
    });
    return;
  }

  if (data.session) setAuthCookies(res, data.session);

  res.status(201).json({
    ...authSuccessResponse(data.user, !data.session),
    message: data.session
      ? "Account created successfully."
      : "Account created. Check your email to verify your account before signing in.",
  });
});

// POST /auth/login — authenticate with password and establish a session.
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = parseCredentials(req.body);
  if ("error" in parsed) {
    res.status(400).json({ error: parsed.error, code: "INVALID_AUTH_INPUT" });
    return;
  }

  const { email, password } = parsed.credentials;
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user || !data.session) {
    const response = authErrorResponse(error ?? new Error("Invalid credentials"));
    res.status(response.status).json(response.body);
    return;
  }

  setAuthCookies(res, data.session);
  res.json({
    ...authSuccessResponse(data.user),
    message: "Signed in successfully.",
  });
});

// POST /auth/logout — clear the local session cookies.
router.post("/auth/logout", async (_req, res): Promise<void> => {
  clearAuthCookies(res);
  res.json({ message: "Signed out successfully." });
});

// GET /auth/session — validate the current session and refresh it when needed.
router.get("/auth/session", async (req, res): Promise<void> => {
  const user = await resolveAuthUser(req, res);
  if (!user) {
    res.status(401).json({
      error: "Not authenticated.",
      code: "AUTH_REQUIRED",
    });
    return;
  }

  res.json({
    ...authSuccessResponse(user),
    message: "Session is valid.",
  });
});

// POST /auth/verification/resend — ask Supabase to send the verification email.
router.post("/auth/verification/resend", async (req, res): Promise<void> => {
  const email =
    req.body && typeof req.body.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({
      error: "Enter a valid email address.",
      code: "INVALID_AUTH_INPUT",
    });
    return;
  }

  const { error } = await supabaseAdmin.auth.resend({
    type: "signup",
    email,
  });

  if (error) {
    const response = authErrorResponse(error);
    res.status(response.status).json(response.body);
    return;
  }

  // Keep this response generic so the endpoint cannot be used to enumerate
  // registered email addresses.
  res.status(202).json({
    message:
      "If an account exists for that email, a verification message has been sent.",
  });
});

export default router;