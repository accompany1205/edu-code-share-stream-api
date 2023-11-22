import { Socket, Server } from "socket.io";
import { type Update } from "@codemirror/collab";
import { ChangeSet, Text } from "@codemirror/state";

import { updateService } from "../services/redis-update.service";
import { pendingManager } from "../services/pending-service";

import { type File, SocketEvents } from "./events";

interface PushUpdatesProps {
  roomId: string;
  version: number;
  updates: string;
  fileName: File;
}

export const pushUpdates =
  (io: Server, socket: Socket) =>
  async ({ roomId, version, updates, fileName }: PushUpdatesProps) => {
    try {
      const roomData = { roomId, fileName };
      const { docUpdates } = await updateService.getDocument(roomData);

      const pullResponseEvenet = `${SocketEvents.PullResponse}${roomId}${fileName.id}`;
      const docUpdatedEvent = `${SocketEvents.DocUpdated}${roomId}`;

      if (version != docUpdates.updates.length) {
        socket.emit(SocketEvents.PushResponse, false);
        const codeInfo = await updateService.getCodeInfo(roomId);

        socket.emit(docUpdatedEvent, codeInfo);
        socket.broadcast.emit(docUpdatedEvent, codeInfo);
      } else {
        const parsedUpdates: Update[] = JSON.parse(updates);
        for (let update of parsedUpdates) {
          const changes = ChangeSet.fromJSON(update.changes);
          const u: Update = {
            changes,
            clientID: update.clientID,
            effects: update.effects,
          };

          await updateService.addUpdates({
            ...roomData,
            updates: ({ updates, doc }) => ({
              updates: [...updates, u],
              doc: changes.apply(Text.of([doc])).toString(),
            }),
          });
        }

        socket.emit(SocketEvents.PushResponse, true);

        const { docUpdates } = await updateService.getUpdates(roomData);
        const pendings = pendingManager.getPendings(roomData);
        const codeInfo = await updateService.getCodeInfo(roomId);

        while (pendings.length) {
          const { socketId, version } = pendingManager.pop(roomData);

          io.to(socketId).emit(docUpdatedEvent, codeInfo);
          io.to(socketId).emit(
            pullResponseEvenet,
            docUpdates.updates.slice(version),
          );
        }
      }
    } catch (error) {
      console.error("pushUpdates", error);
    }
  };
