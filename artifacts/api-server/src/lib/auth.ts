import { createClient, type Session, type User } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabase";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const authApiKey = process.env.SUPABASE_ANON_KEY ?? serviceRoleKey;

if (!supabaseUrl || !authApiKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for Supabase authentication.",
  );
}

const authClientOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
};

/**
 * Auth calls use a request-scoped client so one user's session can never be
 * accidentally shared with another request through a mutable singleton.
 *
 * SUPABASE_ANON_KEY is preferred when configured. The service role key remains
 * a server-only fallback for existing MimiiHub deployments that only provide
 * the required Supabase server credentials.
 */
export function createAuthClient() {
  return createClient(supabaseUrl!, authApiKey!, authClientOptions);
}

export type PublicAuthUser = {
  id: string;
  email: string | null;
  phone?: string;
  role: string;
  aud: string;
  createdAt: string;
  emailConfirmedAt: string | null;
  userMetadata: Record<string, unknown>;
};

export function serializeAuthUser(user: User): PublicAuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    ...(user.phone ? { phone: user.phone } : {}),
    role: user.role ?? "authenticated",
    aud: user.aud ?? "authenticated",
    createdAt: user.created_at,
    emailConfirmedAt: user.email_confirmed_at ?? null,
    userMetadata: user.user_metadata,
  };
}

export function serializeSession(session: Session) {
  return {
    expiresAt: session.expires_at ?? null,
    expiresIn: session.expires_in,
    tokenType: session.token_type,
  };
}

// Keep this import used as a runtime check for the existing required Supabase
// server configuration. The auth client itself uses the scoped key above.
void supabaseAdmin;