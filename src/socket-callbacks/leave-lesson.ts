import { Server } from "socket.io";
import { ActivityManager, ActivityStatus, SocketActivity } from "../activity";
import { Socket } from "socket.io";

export const leaveLesson =
  (socket: Socket, io: Server) =>
  async (data: string) => {
    const { lesson, user } = JSON.parse(data);
    // console.log("leaveLesson", { lesson, user });
    await socket.leave(lesson);
    // console.log(socket);
    // const sockets = await io.in(lesson).fetchSockets();
    // console.log(
    //   "sockets: ",
    //   sockets.map((_socket) => _socket.id),
    // );
    try {
      io.to(lesson).emit("leaveLesson_", { lesson, user });
    } catch (error) {
      console.error("Error emitting leaveLesson event:", error);
    }
  };
