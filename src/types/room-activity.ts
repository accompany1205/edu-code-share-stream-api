import { ActivityStatus } from "../activity";

export type RoomActivity = { [socketId: string]: ActivityStatus };
