import { Socket } from "socket.io";

import { updateService } from "../services/redis-update.service";
import { getUniqCursorName } from "../utils/uniq-cursor-name.utils";

import { SocketEvents, type File } from "./events";

interface GetDocumentProps {
  roomId: string;
  cursorName: string;
  fileName: File;
  preloadedCode?: string;
  defaultFileName: string;
}

export const getDocument =
  (socket: Socket) =>
  async ({
    cursorName: _cursorName,
    roomId,
    fileName,
    defaultFileName,
    preloadedCode = "",
  }: GetDocumentProps) => {
    console.log("getDocument", {
      roomId,
      socket: socket.id,
      fileName,
    });
    const cursorName = getUniqCursorName(_cursorName);

    if (!updateService.isRoomExist(roomId)) {
      socket.join(roomId);
    }

    try {
      const {
        docUpdates: { updates, doc },
      } = await updateService.getDocument({
        roomId,
        fileName,
        defaultFileName,
      });

      const docInfo = await updateService.getCodeInfo(roomId);
      socket.broadcast.emit(`${SocketEvents.RoomExistResponse}${roomId}`);
      socket.emit(SocketEvents.GetDocResponse, {
        version: updates.length,
        doc: preloadedCode + doc,
        cursorName,
        updates,
        docInfo: { ...docInfo, htmlBody: [doc] },
      });
    } catch (error) {
      console.log("getDocument", error);
    }
  };
