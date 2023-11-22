import { ActivityStatus, SocketActivity } from "../activity";

export const getOwnActivityStatus =
  (socketActivity: SocketActivity) =>
  async (callback: (activityStatus: ActivityStatus) => void) => {
    callback(socketActivity.getActivityStatus());
  };
