import { Socket } from "socket.io";

import { updateService } from "../services/redis-update.service";
import { SocketEvents } from "./events";

interface RoomData {
  roomId: string;
  fileName: string;
}

export const createFile =
  (socket: Socket) =>
  async ({ roomId, fileName }: RoomData) => {
    console.log("createFile");
    const file = await updateService.createFile(roomId, fileName);

    socket.emit(`${SocketEvents.CreateFileResponse}${roomId}`, file);
    socket.broadcast.emit(`${SocketEvents.CreateFileResponse}${roomId}`, file);
  };
