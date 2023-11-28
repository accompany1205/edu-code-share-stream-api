import { Socket, Server } from "socket.io";
import { rebaseUpdates, type Update } from "@codemirror/collab";
import { ChangeSet, StateEffect, Text } from "@codemirror/state";

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
  async (
    { roomId, version, updates, fileName }: PushUpdatesProps,
    callback: ({
      status,
      updates,
    }: {
      status: boolean;
      updates: Update[];
    }) => void,
  ) => {
    try {
      const roomData = { roomId, fileName };
      const { docUpdates } = await updateService.getDocument(roomData);

      let parsedUpdates: Update[] = JSON.parse(updates).map(
        (update: Update) => {
          return {
            changes: ChangeSet.fromJSON(update.changes),
            clientID: update.clientID,
            effects: update.effects,
          } as Update;
        },
      );
      try {
        if (version != docUpdates.updates.length) {
          const origParsed = docUpdates.updates.slice(version).map((update) => {
            const pU = JSON.parse(update);
            return {
              changes: ChangeSet.fromJSON(pU.changes),
              clientID: pU.clientID,
              effects: pU.effects,
            } as Update;
          });
          // @ts-ignore
          parsedUpdates = rebaseUpdates(parsedUpdates, origParsed);
        }

        const updatesToSend: Update[] = [];
        let doc = Text.of(docUpdates.doc);
        for (let update of parsedUpdates) {
          updatesToSend.push(update);
          doc = update.changes.apply(doc);
        }

        await updateService.addUpdates({
          ...roomData,
          updates: ({ updates }) => ({
            updates: [
              ...updates,
              ...updatesToSend.map((u) => JSON.stringify(u)),
            ],
            doc: doc.toJSON(),
          }),
        });

        callback({ status: true, updates: updatesToSend });

        io.to(roomId).emit(SocketEvents.CodeUpdated, {
          socketId: socket.id,
          version: docUpdates.updates.length + updatesToSend.length,
          doc: doc.toString(),
        });
      } catch (error) {
        console.error(error);
      }
    } catch (error) {
      console.error("pushUpdates", error);
    }
  };