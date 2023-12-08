import { ActivityManager, ActivityStatus, SocketActivity } from "../activity";
import { RoomActivity } from "../types/room-activity";
import { PermissionError } from "../errors/permission-error";
import { Socket } from "socket.io";

export const getActivityStatus =
  (socket: Socket, activityManager: ActivityManager) =>
  async (
    roomId: string,
    callback: (status: RoomActivity | PermissionError) => void,
  ) => {
    callback(
      await activityManager.getRoomActivity(
        roomId === "all" ? [...socket.rooms] : roomId,
      ),
    );
  };
