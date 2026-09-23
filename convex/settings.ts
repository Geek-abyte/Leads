import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireTeam } from "./authz";

const defaults = {
  quota: 20,
  cadence: [0, 3, 7, 14],
  coldDays: 10,
  stages: [
    "Sourced",
    "Contacted",
    "Followed up",
    "Responded",
    "Booked",
    "Proposal sent",
    "Won",
    "Lost",
  ],
};

export const get = query({
  args: {},
  handler: async (ctx) => {
    await requireTeam(ctx);
    const row = await ctx.db.query("settings").first();
    return row ?? defaults;
  },
});

export const save = mutation({
  args: {
    quota: v.number(),
    cadence: v.array(v.number()),
    coldDays: v.number(),
    stages: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireTeam(ctx);
    const row = await ctx.db.query("settings").first();
    if (row) {
      await ctx.db.patch(row._id, args);
    } else {
      await ctx.db.insert("settings", args);
    }
  },
});

export const resetAll = mutation({
  args: {},
  handler: async (ctx) => {
    await requireTeam(ctx);
    const leads = await ctx.db.query("leads").collect();
    for (const lead of leads) {
      await ctx.db.delete(lead._id);
    }
  },
});
