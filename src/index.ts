import express, { Express, Request, Response } from "express";
import cors from "cors";
import http from "http";
import { Server, Socket } from "socket.io";
import dotenv from "dotenv";

import { ChangeSet, Text } from "@codemirror/state";
import { rebaseUpdates, Update } from "@codemirror/collab";
import { ActivityManager } from "./activity";
import { PermissionError } from "./errors/permission-error";
import { RoomActivity } from "./types/room-activity";
import { getUserId } from "./utils/socket-to-user-id";
import { LessonCode } from "./db/models/lesson-code";
import mongoose, { Types } from "mongoose";
import fs from 'fs'
import * as https from 'https';

dotenv.config();

const port = process.env.PORT || 8000;

const httpsOptions = {
  key: fs.readFileSync('./private.key'),
  cert: fs.readFileSync('./certificate.crt'),
}

const app: Express = express();
const server = https.createServer(httpsOptions, app);

app.use(
  cors({
    origin: "*",
  }),
);

let updates: { [key: string]: Update[] } = {};
// The current document
let doc: { [key: string]: Text } = {};
let pending: { [key: string]: ((value: any) => void)[] } = {};

const roomMetadata: {
  [roomId: string]: {
    owner: string;
    lessonId: string;
    lessonCodeId: Types.ObjectId | undefined;
  };
} = {};

const pendingLessonCodeUpdates: {
  [lessonCodeId: string]: NodeJS.Timeout;
} = {};

const io = new Server(server, {
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.use((socket, next) => {
  if (!socket.handshake.auth.userId) {
    const err = new Error("Not authorized");
    next(err);
  } else {
    next();
  }
});

const activityManager = new ActivityManager(io);

let databaseEnabled = false;

mongoose
  .connect(process.env.MONGODB_URI || "", {
    dbName: "codetribe",
  })
  .then(() => {
    console.log("Database connection successful. Code saving enabled!");
    databaseEnabled = true;
  })
  .catch((e) => {
    console.warn(
      "Database connection failed, database features will be disabled. Error:",
      e.message,
    );
  });

io.on("connection", async (socket: Socket) => {
  const socketActivity = activityManager.initialize(socket);

  // student can use it only
  socket.on(
    "create",
    async (
      roomId: string,
      lessonId: string,
      initialCode: string | undefined,
      callback: (created: boolean) => void,
    ) => {
      console.log("Create room", roomId, "with lesson id", lessonId);
      const userId = getUserId(socket);
      let lessonCodeId: Types.ObjectId | undefined = undefined;
      let lessonCode: string = initialCode ?? "";
      if (databaseEnabled) {
        try {
          const existingLessonCode = await LessonCode.findOne({
            userId,
            lessonId,
          }).exec();
          if (existingLessonCode) {
            lessonCodeId = existingLessonCode._id;
            if (existingLessonCode.code) {
              lessonCode = existingLessonCode.code;
            } else if (initialCode !== undefined) {
              existingLessonCode.code = initialCode;
              await existingLessonCode.save();
            }
          } else {
            lessonCodeId = (
              await LessonCode.create({
                userId,
                lessonId,
                code: lessonCode,
              })
            )._id;
          }
        } catch (e) {
          console.warn(
            `Database connection seems to be broken, the code of the lesson with id ${lessonId} will not be saved for the user with id ${userId}`,
            e,
          );
        }
      }
      roomMetadata[roomId] = { owner: userId, lessonId, lessonCodeId };
      socket.join(roomId);
      if (doc[roomId] !== undefined) {
        if (callback) callback(false);
        return;
      }
      doc[roomId] = Text.of([lessonCode]);
      updates[roomId] = [];
      if (callback) callback(true);
    },
  );

  socket.on("joinLesson", async (lessonId: string) => {
    socket.join(lessonId);
    socket.emit(
      "activityStatusAvailable",
      lessonId,
      await activityManager.getRoomActivity(lessonId),
    );
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

  socket.on("pullUpdates", (roomId: string, version: number, callback) => {
    if (!socket.rooms.has(roomId)) {
      callback(new Error("You are not allowed to access this document"));
      return;
    }
    if (+version < (+updates[roomId]?.length || 0)) {
      callback(JSON.stringify(updates[roomId]?.slice(version) || []));
    } else {
      callback(JSON.stringify([]));
    }
  });

  socket.on(
    "pushUpdates",
    async (roomId: string, version, docUpdates, callback) => {
      if (!socket.rooms.has(roomId)) {
        callback(new Error("You are not allowed to access this document"));
        return;
      }
      docUpdates = JSON.parse(docUpdates);
      try {
        if (version != updates[roomId]?.length) {
          docUpdates = rebaseUpdates(
            docUpdates,
            updates[roomId].slice(version),
          );
        }
        const updatesToSend: Update[] = [];
        for (let update of docUpdates) {
          // Convert the JSON representation to an actual ChangeSet
          // instance
          let changes = ChangeSet.fromJSON(update.changes);
          const u: Update = {
            changes,
            clientID: update.clientID,
            effects: update.effects,
          };
          updates[roomId]?.push(u);
          updatesToSend.push(u);
          doc[roomId] = changes.apply(doc[roomId]);
        }
        callback(true, updatesToSend);

        io.to(roomId).emit(
          "codeUpdated",
          socket.id,
          updates[roomId]?.length || 0,
          doc[roomId]?.toString(),
        );

        const metadata = roomMetadata[roomId];
        const lessonCodeId = metadata?.lessonCodeId;
        const newCode = doc[roomId]?.toString();
        if (lessonCodeId && newCode !== undefined) {
          if (pendingLessonCodeUpdates[lessonCodeId.toHexString()]) {
            clearTimeout(pendingLessonCodeUpdates[lessonCodeId.toHexString()]);
          }

          pendingLessonCodeUpdates[lessonCodeId.toHexString()] = setTimeout(
            async () => {
              try {
                await LessonCode.updateOne(
                  { _id: lessonCodeId },
                  { code: newCode },
                );
              } catch (e) {
                console.warn(
                  `Database connection seems to be broken, the code of the lesson with id ${metadata.lessonId} could not be saved for the user with id ${metadata.owner}`,
                  e,
                );
              }
              delete pendingLessonCodeUpdates[lessonCodeId.toHexString()];
            },
            5000,
          );
        }
      } catch (error) {
        console.error(error);
      }
    },
  );

  socket.on("end", function () {
    socket.disconnect(true);
  });

  socket.on("getDocument", (roomId, callback) => {
    if (!socket.rooms.has(roomId)) {
      callback("You are not allowed to access this document");
      return;
    }

    if (!updates[roomId]) {
      updates[roomId] = [];
    }

    callback(updates[roomId]?.length || 0, doc[roomId]?.toString());
  });

  socket.on("getOwnActivityStatus", (callback) => {
    callback(socketActivity.getActivityStatus());
  });

  socket.on(
    "getActivityStatus",
    async (
      roomId: string,
      callback: (status: RoomActivity | PermissionError) => void,
    ) => {
      if (!socket.rooms.has(roomId) && roomId !== "all") {
        callback({
          error: "PERMISSION_ERROR",
          message:
            "You are not allowed to check the activity status of this room",
        });
        return;
      }

      callback(
        await activityManager.getRoomActivity(
          roomId === "all" ? [...socket.rooms] : roomId,
        ),
      );
    },
  );
});

app.get("/health", (req: Request, res: Response) => {
  res.send("healthy");
});

server.listen(443, () => {
  console.log(`listening on port http://localhost:${port}`);
});
