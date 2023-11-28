import { Socket } from "socket.io";

import { updateService } from "../services/redis-update.service";
import { File } from "./events";

export const fileListUpdated = (socket: Socket) => async (roomId: string, filesInLayout: File[]) => {
  const fileManagement = await updateService.getFileManagement(roomId);

  if (fileManagement == null) {
    return;
  }

  console.log(filesInLayout);

  await updateService.setFileManagement(roomId, {
    ...fileManagement,
    filesInLayout,
  });
}
