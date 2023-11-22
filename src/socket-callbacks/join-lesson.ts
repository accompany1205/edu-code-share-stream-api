import { ActivityManager, ActivityStatus, SocketActivity } from "../activity";
import { Socket } from "socket.io";

export const joinLesson =
  (socket: Socket, activityManager: ActivityManager) =>
  async (lessonId: string) => {
    socket.join(lessonId);
    socket.emit(
      "activityStatusAvailable",
      lessonId,
      await activityManager.getRoomActivity(lessonId),
    );
  };
