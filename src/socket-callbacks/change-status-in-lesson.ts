import { Server } from "socket.io";
import { ActivityManager, ActivityStatus, SocketActivity } from "../activity";
import { Socket } from "socket.io";

export const changeStatusInLesson =
  (socket: Socket, io: Server) => async (data: { [name: string]: string }) => {
    const { lesson, user, status } = data;
    // console.log("changeStatusInLesson", { lesson, user, status });
    socket.data.status = status;
    // const sockets = await io.in(lesson).fetchSockets();
    // console.log(
    //   "sockets: ",
    //   sockets.map((_socket) => _socket.id),
    // );
    try {
      io.to(lesson).emit("changeStatusInLesson_", { user, status });
    } catch (error) {
      console.error("Error emitting joinLesson event:", error);
    }
  };
