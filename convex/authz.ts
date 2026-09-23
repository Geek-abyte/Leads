import { ConvexError } from "convex/values";
import type {
  GenericQueryCtx,
  GenericMutationCtx,
} from "convex/server";
import type { DataModel } from "./_generated/dataModel";
import { isTeamEmail } from "./team";

type Ctx =
  | GenericQueryCtx<DataModel>
  | GenericMutationCtx<DataModel>;

export async function requireTeam(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("You must sign in to access this data.");
  }
  if (!isTeamEmail(identity.email)) {
    throw new ConvexError("Your account isn't authorized for this workspace.");
  }
  return identity;
}
