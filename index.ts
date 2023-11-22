import "dotenv/config";

import { Server, Socket } from "socket.io";
import express, { Request, Response } from "express";
import * as http from "http";

import { SocketEvents } from "./src/socket-callbacks/events";
import { socketCallback } from "./src/socket-callbacks";

const app = express();

app.get("/health", (req: Request, res: Response) => {
  res.send("healthy");
});

const server = http.createServer(app);

const io = new Server(server, {
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket: Socket): void => {
  socket.on(SocketEvents.GetDoc, socketCallback.getDocument(socket));

  socket.on(SocketEvents.Pull, socketCallback.pullUpdates(socket));

  socket.on(SocketEvents.Push, socketCallback.pushUpdates(io, socket));

  socket.on(SocketEvents.GetFileInfo, socketCallback.getFileInfo(socket));

  socket.on(SocketEvents.CreateFile, socketCallback.createFile(socket));

  socket.on(SocketEvents.SetActiveFile, socketCallback.setActiveFile(socket));

  socket.on(
    SocketEvents.AddedFileListUpdated,
    socketCallback.fileListUpdated(socket),
  );

  socket.on(SocketEvents.DeleteFile, socketCallback.deleteFile(socket));

  socket.on(SocketEvents.RoomExist, socketCallback.roomExist(io));

  socket.on(SocketEvents.DeleteRoom, socketCallback.deleteRoom(socket));

  socket.on(SocketEvents.GetCode, socketCallback.getCode(socket));
});

const port = process.env.PORT || 8001;
server.listen(port, () => console.log(`Server listening on port: ${port}`));
