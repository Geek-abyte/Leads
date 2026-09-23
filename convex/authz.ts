import { ConvexError } from "convex/values";
import type { GenericQueryCtx, GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "./_generated/dataModel";
import { isTeamEmail } from "./team";

type Ctx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

export async function requireTeam(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("You must sign in to access this data.");
  }

  let email = identity.email;
  if (!email && typeof identity.subject === "string") {
    try {
      const user = await ctx.db.get(identity.subject as Id<"users">);
      email = user?.email;
    } catch {
      // subject wasn't a users id — fall through
    }
  }

  if (!isTeamEmail(email)) {
    throw new ConvexError(
      "Your account isn't authorized for this workspace. Ask an admin to add your email to TEAM_EMAILS.",
    );
  }
  return identity;
}
