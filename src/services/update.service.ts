import { Update } from "@codemirror/collab";

import { getExtension } from "../utils/get-extension";

export interface Pending {
  version: number
  socketId: string
  fileName: string
  roomId: string
}

interface Updates {
	updates: Update[],
	doc: string,
	pending: Pending[],
}

interface FileManagement {
  activeFile: string
  filesInLayout: string[]
  allFiles: string[]
}

interface Room {
  codeManagement: Map<string, Updates>
  fileManagement: FileManagement
}

const getEmptyUpdates = (preloadedCode?: string) => ({
  updates: [],
  pending: [],
  doc: ''
})

interface EmptyUpdatesProps {
  roomId: string
  fileName: string
  updates?: Updates
  preloadedCode?: string
}

interface GetDocProps {
  roomId: string
  fileName: string
  preloadedCode?: string
}


export class UpdateService {
  private rooms: Record<string, Room> = {}

  isRoomExist = (roomId: string): boolean => {
    return Boolean(this.rooms[roomId])
  }

  getDocument = ({
    roomId,
    fileName,
    preloadedCode
  }: GetDocProps): Updates => {
    const cm = this.getCodeManagement(roomId);
    const updates = this.getUpdates(roomId, fileName);

    if (cm != null && updates != null) {
      return updates;
    }

    if (cm != null && updates == null) {
      return this.addUpdates({ roomId, fileName, preloadedCode })!;
    }

    this.rooms[roomId] = {
      codeManagement: new Map(),
      fileManagement: {
        activeFile: fileName,
        allFiles: [fileName],
        filesInLayout: [fileName]
      }
    }

    return this.addUpdates({ roomId, fileName, preloadedCode })!;
  }

  getUpdates = (roomId: string, fileName: string): Updates | null => {
    return this.getCodeManagement(roomId)?.get(fileName) ?? null;
  }

  getCodeManagement = (roomId: string): Map<string, Updates> | null => {
    return this.rooms[roomId]?.codeManagement ?? null;
  }

  getCodeDocument = (roomId: string) => {
    const data = this.getCodeManagement(roomId);
    const parsedData = data != null
      ? Array.from(data.entries()).reduce<Record<string, string[]>>((res, [key, value]) => {
          const extension = getExtension(key)
          if (extension != null) {
            const v = res[extension + 'Body'];
            res[extension + 'Body'] = v == null
              ? [value.doc.toString()]
              : [...v, value.doc.toString()];
          }

          return res
        }, {})
      : null;

    return parsedData;
  }

  addUpdates = ({
    roomId,
    fileName,
    preloadedCode,
    updates = getEmptyUpdates(preloadedCode)
  }: EmptyUpdatesProps): Updates => {
    this.rooms[roomId].codeManagement.set(fileName, updates);

    return this.getUpdates(roomId, fileName)!;
  }

  deleteFile = (roomId: string, fileName: string): void=> {
    this.getCodeManagement(roomId)?.delete(fileName);
  }

  deleteRoom = (roomId: string): void => {
    delete this.rooms[roomId];
  }

  getFileManagement = (roomId: string): FileManagement | null => {
    return this.rooms[roomId]?.fileManagement;
  }

  setFileManagement = (roomId: string, fileManagement: FileManagement) => {
    if (this.isRoomExist(roomId)) {
      this.rooms[roomId].fileManagement = fileManagement;
    }
  }

  setActiveFile = (roomId: string, fileName: string): void => {
    const fileManagement = this.getFileManagement(roomId);

    if (fileManagement == null) {
      return
    }
 
    this.setFileManagement(roomId, {
      activeFile: fileName,
      allFiles: [...new Set([...fileManagement.allFiles, fileName])],
      filesInLayout: fileManagement.filesInLayout
    })
  }
}

export const updateService = new UpdateService();

