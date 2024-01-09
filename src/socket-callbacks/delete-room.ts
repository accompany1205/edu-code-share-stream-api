import { Socket } from "socket.io";
import { updateService } from "../services/redis-update.service";
import { pendingManager } from "../services/pending-service";

import { SocketEvents } from "./events";

export const deleteRoom = (socket: Socket) => async (roomId: string) => {
  // console.log({ deleteRoom });
  const fileManagement = await updateService.getFileManagement(roomId);

  if (fileManagement != null) {
    fileManagement.allFiles.forEach((fileName) => {
      pendingManager.deletePending({ roomId, fileName });
    });
  }

  await updateService.deleteRoom(roomId);
  socket.broadcast.emit(`${SocketEvents.RoomDeleted}${roomId}`);
  socket.leave(roomId);
};
