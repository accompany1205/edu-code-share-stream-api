import { Server, Socket } from "socket.io";

enum ActivityStatus {
  // Activity in the past <2 minutes
  ACTIVE = "ACTIVE",
  // Activity in the past <5 minutes
  INACTIVE = "INACTIVE",
  // Activity in the past <15 minutes
  IDLE = "IDLE",
  // No activity in the past >15 minutes
  AWAY = "AWAY",
}

export class ActivityManager {
  private lastActivity: { [socketId: string]: number } = {};

  public constructor(private readonly io: Server) {}

  public getActivityStatus(socket: Socket): ActivityStatus {
    const now = Date.now();
    const lastActivityTime = this.lastActivity[socket.id];
    if (lastActivityTime === undefined) {
      return ActivityStatus.AWAY;
    }
    const timeDiff = now - lastActivityTime;
    if (timeDiff < 1000 * 60 * 2) {
      return ActivityStatus.ACTIVE;
    } else if (timeDiff < 1000 * 60 * 5) {
      return ActivityStatus.INACTIVE;
    } else if (timeDiff < 1000 * 60 * 15) {
      return ActivityStatus.IDLE;
    } else {
      return ActivityStatus.AWAY;
    }
  }

  public updateActivityStatus(socket: Socket) {
    const status = this.getActivityStatus(socket);
    socket.rooms.forEach((roomId) => {
      this.io.to(roomId).emit("activityStatus", socket.id, status);
    });
  }

  public updateActivity(socket: Socket) {
    this.lastActivity[socket.id] = Date.now();
  }

  public deleteActivity(socket: Socket) {
    delete this.lastActivity[socket.id];
  }
}
