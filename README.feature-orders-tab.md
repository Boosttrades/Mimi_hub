# Mimi_hub — continuation notes for the Orders-tab work

This file explains precisely what has been changed so far on the feature/orders-tab branch and what the *next developer or AI* should do to finish the feature. Write in plain English — follow the steps in order.

Branch
- feature/orders-tab

What was already done (committed to feature/orders-tab)
1. DB schema
   - Added a new users table schema (Drizzle):
     - lib/db/src/schema/users.ts
       - Fields: id, username (UNIQUE), password_hash (nullable), createdAt
   - Made orders reference a user (nullable user_id) in the Drizzle schema:
     - lib/db/src/schema/orders.ts (added userId: integer("user_id").references(...))
2. Migration
   - Added an SQL migration file to create users table and add user_id column to orders:
     - artifacts/api-server/prisma/migrations/20260804_add_users_and_userid_to_orders.sql
     - This migration creates table users and ALTERs orders ADD COLUMN user_id (nullable, FK -> users.id)
3. API server
   - Enabled cookie parsing in the API app so routes can read and set cookies:
     - artifacts/api-server/src/app.ts (cookie-parser middleware added)

What remains to finish (priority order)
1. Backend routes and logic (required)
   - Create a users router (new file): artifacts/api-server/src/routes/users.ts
     - POST /api/users
       - Accepts { username }
       - Behavior: if username exists return the existing user; otherwise create new user row
       - On success set a cookie `mimi_user_id` (HttpOnly, Secure, SameSite=Lax) expiring in 30 days
       - Response: created/existing user object (id, username, createdAt)
     - GET /api/me
       - Reads cookie mimi_user_id from request (server-side), returns the user object or 401/empty
     - GET /api/users/:id/orders
       - Returns orders where orders.user_id = :id (order by createdAt desc)
   - Wire the users router into artifacts/api-server/src/routes/index.ts (import and router.use)

2. Attach user to new orders (backend change to existing orders router)
   - Update artifacts/api-server/src/routes/orders.ts (existing)
     - In POST /orders (checkout) prefer the server-side cookie to find current user (req.cookies.mimi_user_id).
     - If a user is found, include its id in the inserted order as user_id.
     - Optionally accept body.userId only as fallback, but prefer cookie-based user for security.

3. Frontend changes (Account page) — artifacts/mimihub
   - Edit artifacts/mimihub/src/pages/Account.tsx
     - Current behavior: tabs are already buttons (good). Orders tab shows only a single-ref tracking form.
     - New behavior to implement:
       1. When user clicks Orders and no session exists, show a small modal prompting for a username.
       2. POST the username to POST /api/users. The server will set a cookie (HttpOnly) — the frontend cannot read it directly.
       3. After POST /api/users completes, call GET /api/me to obtain the user id and username.
       4. Call GET /api/users/:id/orders to fetch that user's orders and render them in the Orders tab.
       5. Keep the single-order track-by-ref input (navigation to /orders/:ref) below or beside the orders list.
   - Use the existing UI primitives (Input, Button, LoadingSpinner, EmptyState) — see current Account.tsx.

4. Tests & checks
   - Run typecheck and lint (project uses pnpm and tsc):
     - pnpm install (if needed)
     - pnpm -w run typecheck (or the workspace typecheck command in package.json)
   - Basic manual API smoke tests (see examples below)

Design & security decisions (already chosen)
- Cookie name: `mimi_user_id`
- Cookie flags: HttpOnly, Secure, SameSite=Lax
- Cookie expiry: 30 days
- Username uniqueness: enforced at DB level (unique index). POST /api/users should return existing user if username already exists (idempotent creation by username).
- Passwords: schema includes password_hash (nullable) so password flows can be added later. Do NOT implement password UI now unless requested.

Exact file paths you will edit next
- Add:
  - artifacts/api-server/src/routes/users.ts  <-- new router to implement
- Edit:
  - artifacts/api-server/src/routes/index.ts  <-- import & use users router
  - artifacts/api-server/src/routes/orders.ts  <-- modify POST /orders logic to attach user_id
  - artifacts/mimihub/src/pages/Account.tsx   <-- frontend modal + fetch logic

Migration & local testing steps (developer/AI should follow these)
1. Run DB migration
   - Use your environment's migration tool or psql. Example (replace DATABASE_URL):
     psql "$DATABASE_URL" -f artifacts/api-server/prisma/migrations/20260804_add_users_and_userid_to_orders.sql
   - Alternatively use drizzle-kit if configured: `npx drizzle-kit migrate` (verify your drizzle config)

2. Start backend
   - cd artifacts/api-server
   - pnpm install
   - set env var DATABASE_URL to your Postgres connection string and PORT as needed
   - pnpm run dev (or the repo's dev start script)

3. Start frontend
   - cd artifacts/mimihub
   - pnpm install
   - pnpm run dev (or the repo's dev script)

4. Manual API checks (examples)
   - Create user (and receive Set-Cookie):
     curl -i -X POST -H "Content-Type: application/json" -d '{"username":"alice"}' http://localhost:PORT/api/users
     - Look for `Set-Cookie: mimi_user_id=...` in response headers
   - Get /api/me (include cookie):
     curl -i --cookie "mimi_user_id=THECOOKIE" http://localhost:PORT/api/me
   - Get user orders:
     curl http://localhost:PORT/api/users/USER_ID/orders

Helpful notes for the next AI/developer (be explicit)
- The server will set an HttpOnly cookie; the frontend cannot read it directly from JavaScript. The flow is:
  1. Frontend POST /api/users with username
  2. Server responds with Set-Cookie mimi_user_id and returns user object
  3. Frontend calls GET /api/me to learn current user (server reads cookie and returns user)
  4. Frontend calls GET /api/users/:id/orders to fetch orders

- When modifying the orders router, be careful to preserve all existing fields and behavior (payment flow, timeline, subtotal calculation). Only add `user_id` into the insert when available.

- If you need to create sample orders for testing, you can insert rows directly into the orders table with user_id set to the created user's id.

If you want me to continue from here later, say "Resume" and I will implement the remaining backend and frontend changes and open a PR. For now I pause work on this branch.

---

Last updated: feature/orders-tab state as of commit on the branch. 
