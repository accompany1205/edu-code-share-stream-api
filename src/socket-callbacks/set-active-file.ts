import { Socket } from "socket.io";

import { updateService } from "../services/redis-update.service";

import { type File, SocketEvents } from "./events";

export const setActiveFile = (socket: Socket) => async (roomId: string, fileName: File) => {
  console.log("setActiveFile");

  await updateService.setActiveFile(roomId, fileName);
  socket.broadcast.emit(`${SocketEvents.ActiveFileChanged}${roomId}`, fileName);
}
