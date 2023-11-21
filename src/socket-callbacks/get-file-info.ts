import { Socket } from "socket.io";

import { updateService } from "../services/redis-update.service";

import { SocketEvents } from "./events";

export const getFileInfo =
  (socket: Socket) =>
  async (roomId: string, socketId: string, mode: string) => {
    const fileManagement = await updateService.getFileManagement(roomId);

    if (fileManagement == null) {
      socket.emit(SocketEvents.GetFileInfoResponse, null);
      return;
    }

    const { activeFile, allFiles, filesInLayout } = fileManagement;

    socket.emit(SocketEvents.GetFileInfoResponse, {
      activeFile,
      files: allFiles,
      filesInLayout,
    });
  };
