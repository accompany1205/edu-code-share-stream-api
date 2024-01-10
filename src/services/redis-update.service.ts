import Redis from "ioredis";
import { entries } from "lodash";
import { type Update } from "@codemirror/collab";

import { getExtension } from "../utils/get-extension";
import { type File } from "../socket-callbacks/events";

const getEmptyUpdates = (): Updates => ({
  updates: [],
  doc: "",
});

const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";

const redis = new Redis(REDIS_PORT, REDIS_HOST);

export class RedisUpdateService {
  isRoomExist = async (roomId: string): Promise<boolean> => {
    const room = await this.getRoom(roomId);

    return Boolean(room);
  };

  handleRoomStepExist = async (roomId: string, step: number): Promise<void> => {
    const roomListRes = await redis.get(roomId + "list");
    const roomList = roomListRes ? JSON.parse(roomListRes) : [];
    if (step > roomList.length) {
      if (step === roomList.length + 1) {
        await this.saveToRoomList(roomId);
        await this.deleteRoom(roomId);
      }
      return;
    }
    await redis.set(roomId, JSON.stringify(roomList[step]));
  };

  createFile = async (
    roomId: string,
    fileName: string,
  ): Promise<File | null> => {
    const file = { id: fileName, name: fileName };
    const room = await this.getRoom(roomId);

    if (room != null) {
      room.codeManagement.push({
        fileId: file.id,
        docUpdates: getEmptyUpdates(),
      });

      room.fileManagement = {
        ...room.fileManagement,
        allFiles: [...room.fileManagement.allFiles, file],
      };

      await this.setRoom({ roomId, room });

      return file;
    }

    return null;
  };

  createEmptyRoom = (defaultFileName: string = ""): Room => {
    const file = {
      id: defaultFileName,
      name: defaultFileName,
    };

    return {
      codeManagement: [{ fileId: file.id, docUpdates: getEmptyUpdates() }],
      fileManagement: {
        activeFile: file,
        allFiles: [file],
        filesInLayout: [file],
      },
    };
  };

  setRoom = async ({ roomId, room }: RoomInfo): Promise<void> => {
    await redis.set(roomId, JSON.stringify(room));
  };

  getRoomListLength = async (roomId: string): Promise<number> => {
    const roomListRes = (await redis.get(roomId + "list")) || null;
    if (roomListRes === null) {
      return 0;
    }
    return JSON.parse(roomListRes).length;
  };

  nextItrRoom = async (roomId: string, itr: number): Promise<void> => {
    const roomListRes = (await redis.get(roomId + "list")) || null;

    if (roomListRes === null) {
      return;
    }
    const roomList = JSON.parse(roomListRes);
    if (roomList[itr + 1]) {
      await redis.set(roomId, JSON.stringify(roomList[itr + 1]));
    }
  };

  saveToRoomList = async (roomId: string): Promise<void> => {
    const roomListRes = (await redis.get(roomId + "list")) || null;

    const room = await redis.get(roomId);
    if (roomListRes === null) {
      if (room) await redis.set(roomId + "list", JSON.stringify([room]));
      return;
    }
    const roomList = JSON.parse(roomListRes);

    await redis.set(roomId + "list", JSON.stringify([...roomList, room]));
  };

  prevItrRoom = async (roomId: string, itr: number): Promise<void> => {
    const roomListRes = (await redis.get(roomId + "list")) || null;

    if (roomListRes == null) {
      return;
    }

    const roomList = JSON.parse(roomListRes);
    if (roomList[itr - 1]) {
      redis.set(roomId, JSON.stringify(roomList[itr - 1]));
    }
  };

  getRoom = async (roomId: string): Promise<Room | null> => {
    const room = await redis.get(roomId);

    if (room == null) {
      return null;
    }

    return JSON.parse(room);
  };

  deleteRoom = async (roomId: string): Promise<void> => {
    redis.set(roomId, "");
  };

  getUpdates = async ({ roomId, fileName }: DocInfo): Promise<Document> => {
    const room = (await this.getRoom(roomId)) as Room;
    console.log("getupdates", room);
    console.log(room?.codeManagement);

    return room.codeManagement?.find(
      ({ fileId }) => fileId === fileName.id,
    ) as Document;
  };

  isDocumentExist = async ({ roomId, fileName }: DocInfo): Promise<boolean> => {
    return Boolean(this.getUpdates({ roomId, fileName }));
  };

  getCodeManagement = async (
    roomId: string,
  ): Promise<Room["codeManagement"] | null> => {
    return (await this.getRoom(roomId))?.codeManagement ?? null;
  };

  getCodeInfo = async (
    roomId: string,
  ): Promise<Record<string, string[]> | null> => {
    const room = await this.getRoom(roomId);

    const parsedData =
      room != null
        ? room.codeManagement.reduce<Record<string, string[]>>((res, item) => {
            const file = room.fileManagement.allFiles.find(
              ({ id }) => id === item.fileId,
            );

            if (file != null) {
              const extension = getExtension(file.name);
              const doc = res[`${extension}Body`];

              res[`${extension}Body`] =
                doc == null
                  ? [item.docUpdates.doc.toString()]
                  : [...doc, item.docUpdates.doc.toString()];
            }

            return res;
          }, {})
        : null;

    return parsedData;
  };

  addUpdates = async ({
    fileName,
    roomId,
    updates = getEmptyUpdates(),
  }: AddUpdatesProps): Promise<void> => {
    const room = await this.getRoom(roomId);

    if (room != null) {
      const index = room.codeManagement.findIndex(
        ({ fileId }) => fileId === fileName.id,
      );

      if (index > -1) {
        const document = room.codeManagement[index];
        room.codeManagement[index] =
          typeof updates === "function"
            ? {
                ...document,
                docUpdates: updates({ ...document.docUpdates }),
              }
            : { ...document, docUpdates: updates };

        await this.setRoom({ room, roomId });
      }
    }
  };

  getDocument = async ({
    roomId,
    fileName,
    defaultFileName = "index.html",
    roomStep = 0,
  }: GetDocInfo): Promise<Document> => {
    await this.handleRoomStepExist(roomId, roomStep);

    const isRoomExist = await this.isRoomExist(roomId);

    if (!isRoomExist) {
      const room = this.createEmptyRoom(defaultFileName);
      await this.setRoom({ roomId, room });
    }

    const isDocExist = await this.isDocumentExist({ roomId, fileName });

    if (!isDocExist) {
      await this.addUpdates({ roomId, fileName });
    }
    console.log();
    console.log("getDocument");
    return await this.getUpdates({ roomId, fileName });
  };

  _getDocument = async ({
    roomId,
    fileName,
    defaultFileName = "index.html",
  }: GetDocInfo): Promise<Document> => {
    const isRoomExist = await this.isRoomExist(roomId);

    if (!isRoomExist) {
      const room = this.createEmptyRoom(defaultFileName);
      await this.setRoom({ roomId, room });
    }

    const isDocExist = await this.isDocumentExist({ roomId, fileName });

    if (!isDocExist) {
      await this.addUpdates({ roomId, fileName });
    }

    return await this.getUpdates({ roomId, fileName });
  };

  getFileManagement = async (
    roomId: string,
  ): Promise<FileManagement | null> => {
    const room = await this.getRoom(roomId);
    return room?.fileManagement ?? null;
  };

  setFileManagement = async (
    roomId: string,
    fileManagement: FileManagement,
  ): Promise<void> => {
    const room = await this.getRoom(roomId);

    if (room != null) {
      room.fileManagement = fileManagement;
      await this.setRoom({ roomId, room });
    }
  };

  setActiveFile = async (roomId: string, fileName: File): Promise<void> => {
    const fileManagement = await this.getFileManagement(roomId);

    if (fileManagement == null) {
      return;
    }

    const { filesInLayout, allFiles } = fileManagement;
    const isFileExist = allFiles.some(({ id }) => id === fileName.id);

    await this.setFileManagement(roomId, {
      filesInLayout,
      activeFile: fileName,
      allFiles: isFileExist ? allFiles : [...allFiles, fileName],
    });
  };

  deleteFile = async (roomId: string, fileName: File): Promise<void> => {
    const room = await this.getRoom(roomId);

    if (room != null) {
      const index = room.codeManagement.findIndex(
        ({ fileId }) => fileId === fileName.id,
      );

      if (index > -1) {
        const newCodeManagement = [...room.codeManagement];
        newCodeManagement.splice(index, 1);
        room.codeManagement = newCodeManagement;
        await this.setRoom({ roomId, room });
      }
    }
  };
}

interface Updates {
  updates: Update[];
  doc: string;
}

interface FileManagement {
  activeFile: File;
  filesInLayout: File[];
  allFiles: File[];
}

interface Document {
  fileId: string;
  docUpdates: Updates;
}

interface Room {
  codeManagement: Document[];
  fileManagement: FileManagement;
}

export interface DocInfo {
  fileName: File;
  roomId: string;
}

export interface GetDocInfo extends DocInfo {
  defaultFileName?: string;
  roomStep?: number;
}

interface RoomInfo {
  roomId: string;
  room: Room;
}

interface AddUpdatesProps extends DocInfo {
  updates?: Updates | ((updates: Updates) => Updates);
}

export const updateService = new RedisUpdateService();
