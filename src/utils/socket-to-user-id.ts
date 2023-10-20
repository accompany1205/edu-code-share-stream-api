import { RemoteSocket, Socket } from "socket.io";

export function getUserId(socket: Socket | RemoteSocket<any, any>): string {
  return socket.handshake.auth.userId as string;
}
