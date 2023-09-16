import { Entity, Schema, Client, Repository } from "redis-om";

class Updates extends Entity {}

export const updates = new Schema(Updates, {
  roomId: { type: "string" },
  updates: { type: "string" },
});
