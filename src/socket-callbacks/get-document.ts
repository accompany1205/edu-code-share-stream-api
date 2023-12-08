import { Socket } from "socket.io";

import { updateService } from "../services/redis-update.service";
import { getUniqCursorName } from "../utils/uniq-cursor-name.utils";

import { SocketEvents, type File } from "./events";
import { Text } from "@codemirror/state";
import { getUserId } from "../utils/socket-to-user-id";

interface GetDocumentProps {
  roomId: string;
  userId: string;
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
  }: GetDocumentProps) => {
    const cursorName = getUniqCursorName(_cursorName);

    socket.join(roomId);

    try {
      const {
        docUpdates: { updates, doc },
      } = await updateService.getDocument({
        roomId,
        userId: getUserId(socket),
        fileName,
        defaultFileName,
      });

      const docInfo = await updateService.getCodeInfo(roomId);

      socket.broadcast.emit(`${SocketEvents.RoomExistResponse}${roomId}`);
      socket.emit(SocketEvents.GetDocResponse, {
        version: updates.length,
        doc: Text.of(doc).toString(),
        cursorName,
        updates,
        docInfo,
      });
    } catch (error) {
      console.log("getDocument", error);
    }
  };
