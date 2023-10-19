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
  private socketActivity: { [socketId: string]: SocketActivity } = {};

  public constructor(private readonly io: Server) {}

  public initialize(socket: Socket) {
    const socketActivity = new SocketActivity(this.io, socket, () => {
      this.destroySocketActivity(socket.id);
    });
    this.socketActivity[socket.id] = socketActivity;
    return socketActivity;
  }

  public destroySocketActivity(socketId: string) {
    delete this.socketActivity[socketId];
  }
}

export class SocketActivity {
  private lastActivity: number;

  public constructor(
    private readonly io: Server,
    public readonly socket: Socket,
    private readonly destroyHandler?: () => void,
  ) {
    this.lastActivity = Date.now();

    socket.on("disconnect", this.onDisconnect);
    // Only update activity when the user is pushing updates (i.e. typing)
    socket.on("pushUpdates", this.onPushUpdates);
  }

  public getActivityStatus(): ActivityStatus {
    const now = Date.now();
    const lastActivityTime = this.lastActivity;
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

  private updateActivityStatus() {
    const status = this.getActivityStatus();
    this.socket.rooms.forEach((roomId) => {
      this.io.to(roomId).emit("activityStatus", this.socket.id, status);
    });
  }

  private updateActivity() {
    this.lastActivity = Date.now();
  }

  private onPushUpdates() {
    this.updateActivity();
  }

  private onDisconnect() {
    this.socket.off("disconnect", this.onDisconnect);
    this.socket.off("pushUpdates", this.onPushUpdates);
    this.destroyHandler?.();
  }
}
