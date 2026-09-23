import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,

  leads: defineTable({
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
  }).index("by_stage", ["stage"]),

  settings: defineTable({
    quota: v.number(),
    cadence: v.array(v.number()),
    coldDays: v.number(),
    stages: v.array(v.string()),
  }),
});

export default schema;
