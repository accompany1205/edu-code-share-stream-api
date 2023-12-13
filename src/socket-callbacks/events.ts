export enum SocketEvents {
  PushResponse = "pushUpdateResponse",
  GetFileInfoResponse = "getFileInfoResponse",
  GetDocResponse = "getDocumentResponse",
  ActiveFileChanged = "activeFileChanged",
  DeleteResponse = "deleteFileResponse",
  AddFile = "addFile",
  Pull = "pullUpdates",
  PullResponse = "pullUpdateResponse",
  Push = "pushUpdates",
  GetDoc = "getDocument",
  DeleteRoom = "deleteRoom",
  SetActiveFile = "setActiveFile",
  DeleteFile = "deleteFile",
  GetFileInfo = "getFileInfo",
  AddFileResponse = "addFileResponse",
  AddedFileListUpdated = "addedFileListUpdated",
  RoomExist = "isRoomExist",
  RoomExistResponse = "isRoomExistResponse",
  RoomDeleted = "isRoomDeleted",
  DocUpdated = "docUpdated",
  GetCode = "getCode",
  GetCodeResponse = "getCodeResponse",
  CreateFile = "createFile",
  CreateFileResponse = "createFileResponse"
}

export interface File {
  id: string
  name: string
}
