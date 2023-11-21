import { Server } from "socket.io";

import { updateService } from "../services/redis-update.service";

import { SocketEvents } from "./events";

export const roomExist = (io: Server) => async (roomId: string, socketId: string) => {
  const isRoomExist = await updateService.isRoomExist(roomId);

  io.to(socketId).emit(`${SocketEvents.RoomExistResponse}${roomId}${socketId}`, isRoomExist);
}
