"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updates = void 0;
const redis_om_1 = require("redis-om");
class Updates extends redis_om_1.Entity {
}
exports.updates = new redis_om_1.Schema(Updates, {
    roomId: { type: "string" },
    updates: { type: "string" },
});
