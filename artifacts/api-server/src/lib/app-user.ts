import { eq } from "drizzle-orm";
import type { User as AuthUser } from "@supabase/supabase-js";
import { db, usersTable, type User as AppUser } from "@workspace/db";

export type PublicAppUser = Pick<
  AppUser,
  "id" | "username" | "email" | "fullName" | "role" | "createdAt"
>;

export function serializeAppUser(user: AppUser, authUser?: AuthUser): PublicAppUser {
  const metadataName = authUser?.user_metadata?.full_name;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    fullName: user.fullName ?? (typeof metadataName === "string" ? metadataName : null),
  };
}

/**
 * Create the MimiiHub profile only after Supabase has confirmed the email.
 * Existing username-based order/cart rows are linked when their username
 * exactly matches the verified email address.
 */
export async function ensureAppUser(authUser: AuthUser): Promise<AppUser> {
  const email = authUser.email?.trim().toLowerCase();
  const metadataName = authUser.user_metadata?.full_name;
  const fullName = typeof metadataName === "string" && metadataName.trim()
    ? metadataName.trim().slice(0, 120)
    : null;
  if (!email || !authUser.email_confirmed_at) {
    throw new Error("A verified Supabase email is required.");
  }

  const [byAuthId] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.authUserId, authUser.id));

  if (byAuthId) {
    if (byAuthId.email !== email) {
      const [updated] = await db
        .update(usersTable)
        .set({ email, ...(fullName && !byAuthId.fullName ? { fullName } : {}) })
        .where(eq(usersTable.id, byAuthId.id))
        .returning();
      return updated;
    }
    return byAuthId;
  }

  const [legacyMatch] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, email));

  if (legacyMatch) {
    const [linked] = await db
      .update(usersTable)
      .set({ authUserId: authUser.id, email, fullName })
      .where(eq(usersTable.id, legacyMatch.id))
      .returning();
    return linked;
  }

  try {
    const [created] = await db
      .insert(usersTable)
      .values({
        authUserId: authUser.id,
        email,
        fullName,
        username: email,
        role: "customer",
      })
      .returning();
    return created;
  } catch (error) {
    // Concurrent first requests may both attempt to create the same profile.
    const [racedProfile] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.authUserId, authUser.id));
    if (racedProfile) return racedProfile;
    throw error;
  }
}
