import { Socket } from "socket.io";

import { updateService } from "../services/redis-update.service";

import { File, SocketEvents } from "./events";
import { getUserId } from "../utils/socket-to-user-id";

interface PullUpdateProps {
  roomId: string;
  version: number;
  fileName: File;
  socketId: string;
}

export const pullUpdates =
  (socket: Socket) =>
  async (
    { roomId, version, fileName, socketId }: PullUpdateProps,
    callback: (updates: string[]) => void,
  ) => {
    try {
      const roomData = { roomId, fileName, userId: getUserId(socket) };
      const {
        docUpdates: { updates },
      } = await updateService.getDocument(roomData);

      if (version < updates.length) {
        callback(updates.slice(version));
      } else {
        callback([]);
      }
    } catch (error) {
      console.error("pullUpdates", error);
    }
  };
