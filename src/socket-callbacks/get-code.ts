import { Socket } from "socket.io";

import { updateService } from "../services/redis-update.service";
import { SocketEvents } from "./events";

export const getCode = (socket: Socket) => async (roomId: string) => {
  const docInfo = await updateService.getCodeInfo(roomId);
  socket.emit(`${SocketEvents.GetDocResponse}${roomId}`, docInfo);
}