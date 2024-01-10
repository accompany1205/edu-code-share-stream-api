import { Socket } from "socket.io";

import { updateService } from "../services/redis-update.service";
import { pendingManager } from "../services/pending-service";

import { File, SocketEvents } from "./events";

interface PullUpdateProps {
  roomId: string;
  version: number;
  fileName: File;
  socketId: string;
}

export const pullUpdates =
  (socket: Socket) =>
  async ({ roomId, version, fileName, socketId }: PullUpdateProps) => {
    try {
      const roomData = { roomId, fileName };
      console.log("pullUpdates:", { socketId, roomId });

      const pending = { socketId, version };
      const {
        docUpdates: { updates },
      } = await updateService._getDocument(roomData);
      const pullResponseEvent = `${SocketEvents.PullResponse}${roomId}${fileName.id}`;

      if (version < updates.length) {
        socket.emit(pullResponseEvent, updates.slice(version));
      } else {
        const isRoomExist = pendingManager.isPendingExist({
          ...roomData,
          ...pending,
        });

        if (!isRoomExist) {
          pendingManager.add({ ...roomData, pending });
        }
      }
    } catch (error) {
      console.error("pullUpdates", error);
    }
  };
