import express, { Express, Request, Response } from "express";
import cors from "cors";
import http from "http";
import { Server, Socket } from "socket.io";
import dotenv from "dotenv";
import * as _ from "lodash";

import { ChangeSet, Text } from "@codemirror/state";
import { Update } from "@codemirror/collab";

dotenv.config();

const port = process.env.PORT || 8000;

const app: Express = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: "*",
  })
);

let updates: { [key: string]: Update[] } = {};
// The current document
let doc: { [key: string]: Text } = {};
let pending: { [key: string]: ((value: any) => void)[] } = {};

const getRoomId = (socket: Socket) => Array.from(socket.rooms)[1];

const io = new Server(server, {
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", async (socket: Socket) => {
  // student can use it only
  socket.on("create", (roomId: string) => {
    console.log(roomId, "SET ROOM ID");
    doc[roomId] = Text.of([""]);
    updates[roomId] = [];
    socket.join(roomId);
  });

  socket.on("deleteRoom", (roomId: string) => {
    socket.leave(roomId);
    delete doc[roomId];
    delete updates[roomId];
    delete pending[roomId];
  });
  // --------------------------

  // manager can use it only
  socket.on("joinRoom", (roomId: string) => {
    socket.join(roomId);
  });

  socket.on("leaveRoom", (roomId: string) => {
    socket.leave(roomId);
  });
  // --------------------------

  socket.on("pullUpdates", (version: number, callback) => {
    const roomId = getRoomId(socket);
    if (+version < (+updates[roomId]?.length || 0)) {
      callback(JSON.stringify(updates[roomId]?.slice(version) || []));
    } else {
      if (!pending[roomId]) pending[roomId] = [];
      pending[roomId].push((updates) => {
        callback(JSON.stringify(updates || []));
      });
    }
  });

  socket.on("pushUpdates", (version, docUpdates, callback) => {
    const roomId = getRoomId(socket);
    docUpdates = JSON.parse(docUpdates);
    try {
      if (version != updates[roomId]?.length) {
        callback(false);
      } else {
        for (let update of docUpdates) {
          // Convert the JSON representation to an actual ChangeSet
          // instance
          let changes = ChangeSet.fromJSON(update.changes);
          // @ts-ignore
          updates[roomId]?.push({ changes, clientID: update.clientID });
          doc[roomId] = changes.apply(doc[roomId]);
        }
        callback(true);

        while (pending[roomId].length) pending[roomId].pop()!(docUpdates);
      }
      io.to(roomId).emit("codeUpdated", updates[roomId]?.length || 0, doc[roomId]?.toString());
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("end", function () {
    socket.disconnect(true);
  });

  socket.on("getDocument", (roomId, callback) => {
    if(!socket.rooms.has(roomId)) {
      callback("You are not allowed to access this document");
      return;
    }

    if (!updates[roomId]) {
      updates[roomId] = [];
    }

    callback(updates[roomId]?.length || 0, doc[roomId]?.toString());
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.send("healthy");
});

server.listen(port, () => {
  console.log(`listening on port http://localhost:${port}`);
});
