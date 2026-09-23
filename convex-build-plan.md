# Lead Tracker on Convex — Build Plan

Rebuilding the lead pipeline tracker on Convex, with authentication and shared live data for the team.

## 1. Scaffold the Convex project

Run `npm create convex@latest` (pick a React + Vite template), or add Convex to an existing app with `npm install convex` followed by `npx convex dev`. This logs you into Convex via GitHub, creates a project, and generates a `convex/` folder plus a dev deployment URL. Keep `npx convex dev` running in a terminal while you build — it live-syncs your backend code.

## 2. Design the schema

In `convex/schema.ts`, define:

- **`leads` table** — name, contact, email, website, source, angle, notes, stage, heat, heatPinned, touches, lastTouch, nextFollowUp, contactedDate
- **`settings` table** — quota, cadence (array), coldDays, stages (array), single row

This is a direct port of the data shape already in the HTML tracker.

## 3. Write the backend functions

In `convex/leads.ts` and `convex/settings.ts`, write:

- **Queries:** `list`, `get`
- **Mutations:** `add`, `update`, `remove`, `logTouch`, `saveSettings`

These replace the localStorage read/write calls in the current file almost one-to-one. `logTouch` keeps the cadence/stage-advance logic already in the app, just moved server-side.

## 4. Add authentication

Set up Convex Auth (simplest — email magic link or password, no third party) or Clerk if you want more login options. This gives each of your work buddies their own identity, which you'll want for permissions and later for a "last edited by" trail, even if everyone starts with the same access level.

## 5. Decide on permissions

Simplest model: any signed-in user can read and write every lead (matches "all the admin capacity"). If you later want roles, add a `role` field to a `users` table and check it in mutations before allowing writes — but skip this until you actually need it.

## 6. Rewire the frontend to Convex hooks

Swap the `loadLeads` / `saveLeads` / `loadSettings` / `saveSettings` functions for Convex's `useQuery` and `useMutation` hooks. `useQuery` gives you live data automatically — no manual refresh, no snapshot-listener boilerplate to write yourself. The UI, styling, and logic (heat calculation, filters, modals) carry over unchanged; only the data layer changes. This step effectively means porting the current plain HTML/JS UI into React components, since Convex works best with a React frontend.

## 7. Deploy

Push your backend with `npx convex deploy` to get a production deployment, then deploy the frontend to Vercel or Netlify (both have a free tier and deploy straight from a GitHub repo). Point the frontend's Convex client at the production deployment URL.

## 8. Invite your team

Share the deployed URL. Each buddy signs up or logs in once, and from then on everyone sees the same live pipeline — add a lead, log a touch, or change a stage, and it updates for everyone instantly.

---

**What's pure code vs. what needs your machine/accounts:**

- Steps 2, 3, and 6 (schema, backend functions, React rewrite) can be written without a Convex account.
- Steps 1, 4, 7, and 8 need your actual machine and accounts (running `npx convex dev`, logging into Convex/GitHub, deploying).
