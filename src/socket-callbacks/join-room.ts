import { Socket } from "socket.io";

export const joinRoom = (socket: Socket) => async (roomId: string) => {
  socket.join(roomId);
  console.log("joinRoom", roomId);
};
