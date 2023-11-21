import { fileListUpdated } from "./file-list-updated";
import { setActiveFile } from "./set-active-file";
import { getFileInfo } from "./get-file-info";
import { pullUpdates } from "./pull-updates";
import { pushUpdates } from "./push-updates";
import { getDocument } from "./get-document";
import { deleteFile } from "./delete-file";
import { deleteRoom } from "./delete-room";
import { createFile } from "./create-file";
import { roomExist } from "./room-exist";
import { getCode } from "./get-code";

export const socketCallback = {
  fileListUpdated,
  setActiveFile,
  getFileInfo,
  pullUpdates,
  pushUpdates,
  getDocument,
  createFile,
  deleteFile,
  deleteRoom,
  roomExist,
  getCode,
}
