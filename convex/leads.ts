import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const leadFields = {
  name: v.string(),
  contact: v.string(),
  email: v.string(),
  website: v.string(),
  source: v.string(),
  angle: v.string(),
  notes: v.string(),
  stage: v.string(),
  heat: v.string(),
  heatPinned: v.boolean(),
  touches: v.number(),
  lastTouch: v.optional(v.string()),
  nextFollowUp: v.string(),
  contactedDate: v.optional(v.string()),
};

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("leads").collect();
  },
});

export const get = query({
  args: { id: v.id("leads") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const add = mutation({
  args: leadFields,
  handler: async (ctx, args) => {
    return await ctx.db.insert("leads", args);
  },
});

export const update = mutation({
  args: { id: v.id("leads"), ...leadFields },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const logTouch = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, { id }) => {
    const lead = await ctx.db.get(id);
    if (!lead) throw new Error("Lead not found");

    const settings = await ctx.db.query("settings").first();
    const cadence = settings?.cadence ?? [0, 3, 7, 14];
    const stages = settings?.stages ?? [
      "Sourced",
      "Contacted",
      "Followed up",
      "Responded",
      "Booked",
      "Proposal sent",
      "Won",
      "Lost",
    ];

    const today = new Date().toISOString().slice(0, 10);
    const touches = (lead.touches || 0) + 1;
    const idx = Math.min(touches, cadence.length - 1);
    const nextDate = new Date(today + "T00:00:00");
    nextDate.setDate(nextDate.getDate() + (cadence[idx] ?? 7));

    const curIdx = stages.indexOf(lead.stage);
    let stage = lead.stage;
    if (curIdx === 0 && stages[1]) stage = stages[1];
    else if (curIdx === 1 && stages[2]) stage = stages[2];

    await ctx.db.patch(id, {
      touches,
      lastTouch: today,
      contactedDate: lead.contactedDate ?? today,
      nextFollowUp: nextDate.toISOString().slice(0, 10),
      stage,
    });
  },
});

export const setStage = mutation({
  args: { id: v.id("leads"), stage: v.string() },
  handler: async (ctx, { id, stage }) => {
    const lead = await ctx.db.get(id);
    if (!lead) return;
    const patch: { stage: string; heat?: string } = { stage };
    if (!lead.heatPinned) {
      if (["Won", "Booked", "Proposal sent", "Responded"].includes(stage))
        patch.heat = "hot";
      else if (stage === "Lost") patch.heat = "cold";
    }
    await ctx.db.patch(id, patch);
  },
});

export const setHeat = mutation({
  args: { id: v.id("leads"), heat: v.string() },
  handler: async (ctx, { id, heat }) => {
    await ctx.db.patch(id, { heat, heatPinned: true });
  },
});

export const setNextFollowUp = mutation({
  args: { id: v.id("leads"), nextFollowUp: v.string() },
  handler: async (ctx, { id, nextFollowUp }) => {
    await ctx.db.patch(id, { nextFollowUp });
  },
});
