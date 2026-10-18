import { eq } from "drizzle-orm";
import type { User as AuthUser } from "@supabase/supabase-js";
import { db, usersTable, type User as AppUser } from "@workspace/db";

export type PublicAppUser = Pick<
  AppUser,
  "id" | "username" | "email" | "phone" | "fullName" | "role" | "createdAt"
>;

export function serializeAppUser(user: AppUser, authUser?: AuthUser): PublicAppUser {
  const metadataName = authUser?.user_metadata?.full_name;
  return {
    id: user.id,
    username: user.username,
    email: user.email ?? "",
    phone: user.phone ?? authUser?.phone ?? null,
    role: user.role,
    createdAt: user.createdAt,
    fullName: user.fullName ?? (typeof metadataName === "string" ? metadataName : null),
  };
}

/**
 * Create a profile only after Supabase confirms the account's phone or email.
 * Phone is the primary sign-in identifier; email is optional contact information.
 */

export async function ensureAppUser(authUser: AuthUser): Promise<AppUser> {
  const emailFromMetadata = authUser.user_metadata?.contact_email;
  const email = authUser.email?.trim().toLowerCase() || (typeof emailFromMetadata === "string" ? emailFromMetadata.trim().toLowerCase() : null);
  const phone = authUser.phone?.trim() || null;
  const verified = Boolean(authUser.phone_confirmed_at || authUser.email_confirmed_at);
  const metadataName = authUser.user_metadata?.full_name;
  const fullName = typeof metadataName === "string" && metadataName.trim()
    ? metadataName.trim().slice(0, 120)
    : null;
  if (!verified || (!phone && !email)) {
    throw new Error("A verified phone number or email is required.");
  }
  const username = email || phone!;

  const [byAuthId] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.authUserId, authUser.id));

  if (byAuthId) {
    if (byAuthId.email !== email || byAuthId.phone !== phone) {
      const [updated] = await db
        .update(usersTable)
        .set({ email, phone, ...(fullName && !byAuthId.fullName ? { fullName } : {}) })
        .where(eq(usersTable.id, byAuthId.id))
        .returning();
      return updated;
    }
    return byAuthId;
  }

  const [legacyMatch] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));

  if (legacyMatch) {
    const [linked] = await db
      .update(usersTable)
      .set({ authUserId: authUser.id, email, phone, fullName })
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
        phone,
        fullName,
        username,
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
