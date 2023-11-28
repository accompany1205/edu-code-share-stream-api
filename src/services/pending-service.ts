import { type DocInfo } from "./redis-update.service";

export interface Pending {
  version: number;
  socketId: string;
}

interface AddPendingProps extends DocInfo {
  pending: Pending;
}

interface SetPendingProps extends DocInfo {
  pendings: Pending[];
}

interface IsPendingExistProps extends DocInfo, Pending {}

export class PendingManager {
  private pending: Record<string, Pending[]> = {};

  private setPendings = ({
    fileName,
    roomId,
    pendings,
  }: SetPendingProps): void => {
    this.pending[`${roomId}${fileName.id}`] = pendings;
  };

  getPendings = ({ fileName, roomId }: DocInfo): Pending[] => {
    return this.pending[`${roomId}${fileName.id}`] ?? [];
  };

  add = ({ pending, ...docInfo }: AddPendingProps) => {
    const oldPendings = this.getPendings(docInfo) ?? [];
    const pendings = [...(oldPendings ?? [])];
    pendings.push(pending);

    this.setPendings({ ...docInfo, pendings });
  };

  pop = (docInfo: DocInfo): Pending => {
    const pendings = this.getPendings(docInfo);
    const removedPending = pendings.pop();
    this.setPendings({ ...docInfo, pendings });

    return removedPending as Pending;
  };

  isPendingExist = ({
    version: v,
    socketId: s,
    ...docInfo
  }: IsPendingExistProps): boolean => {
    const pendings = this.getPendings(docInfo);

    return pendings.some(
      ({ version, socketId }) => v === version && s === socketId,
    );
  };

  deletePending = ({ roomId, fileName }: DocInfo) => {
    delete this.pending[`${roomId}${fileName.id}`];
  };
}

export const pendingManager = new PendingManager();
