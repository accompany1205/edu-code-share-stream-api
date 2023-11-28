import { Socket } from "socket.io";

import { pendingManager } from "../services/pending-service";
import { updateService } from "../services/redis-update.service";

import { File, SocketEvents } from "./events";

export const deleteFile = (socket: Socket) => async (roomId: string, fileName: File) => {
  pendingManager.deletePending({ roomId, fileName });
  await updateService.deleteFile(roomId, fileName);

  socket.broadcast.emit(`${SocketEvents.DeleteResponse}${roomId}`, fileName);
}
