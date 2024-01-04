import { Server } from "socket.io";
import { ActivityManager, ActivityStatus, SocketActivity } from "../activity";
import { Socket } from "socket.io";

export const joinLesson =
  (socket: Socket, activityManager: ActivityManager, io: Server) =>
  async (data: string) => {
    const { lesson, user } = JSON.parse(data);
    // console.log("joinLesson", { lesson, user });
    socket.data.userId = user;
    socket.data.status = "idle";
    await socket.join(lesson);
    // console.log(socket);
    const sockets = await io.in(lesson).fetchSockets();
    // console.log(
    //   "sockets: ",
    //   sockets.map((_socket) => _socket.id),
    // );
    try {
      io.to(lesson).emit("joinLesson_", { lesson, user });
    } catch (error) {
      console.error("Error emitting joinLesson event:", error);
    }
    const participants = sockets.map((_socket) => ({
      id: _socket.data.userId,
      status: _socket.data.status,
    }));
    socket.emit("lessonMembers", { participants });
    socket.emit(
      "activityStatusAvailable",
      lesson,
      await activityManager.getRoomActivity(lesson),
    );
  };
