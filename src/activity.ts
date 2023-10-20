import { Server, Socket } from "socket.io";
import { getUserId } from "./utils/socket-to-user-id";

const ACTIVE_TIME = 1000 * 60 * 2;
const INACTIVE_TIME = 1000 * 60 * 5;
const IDLE_TIME = 1000 * 60 * 15;

export enum ActivityStatus {
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
  private socketActivity: { [userId: string]: SocketActivity } = {};

  public constructor(private readonly io: Server) {}

  public initialize(socket: Socket) {
    const socketActivity = new SocketActivity(this.io, socket, () => {
      this.destroySocketActivity(getUserId(socket));
    });
    this.socketActivity[getUserId(socket)] = socketActivity;
    return socketActivity;
  }

  public getSocketActivity(userId: string): SocketActivity | undefined {
    return this.socketActivity[userId];
  }

  public async getRoomActivity(roomId: string) {
    return Object.fromEntries<ActivityStatus>(
      (await this.io.in(roomId).fetchSockets())
        .map(
          (s) =>
            [
              getUserId(s),
              this.getSocketActivity(getUserId(s))?.getActivityStatus(),
            ] as const,
        )
        .filter((e): e is [string, ActivityStatus] => e[1] !== undefined),
    );
  }

  private destroySocketActivity(userId: string) {
    delete this.socketActivity[userId];
  }
}

export class SocketActivity {
  private lastActivity: number | undefined;
  private activityStatusUpdateTimeout: NodeJS.Timeout | undefined;

  public constructor(
    private readonly io: Server,
    public readonly socket: Socket,
    private readonly destroyHandler?: () => void,
  ) {
    this.updateActivity();

    socket.on("disconnect", this.onDisconnect);
    // Only update activity when the user is pushing updates (i.e. typing)
    socket.on("pushUpdates", this.onPushUpdates);
  }

  public getActivityStatus(): ActivityStatus {
    const now = Date.now();
    const lastActivityTime = this.lastActivity;
    if (lastActivityTime === undefined) {
      return ActivityStatus.ACTIVE;
    }
    const timeDiff = now - lastActivityTime;
    if (timeDiff < ACTIVE_TIME) {
      return ActivityStatus.ACTIVE;
    } else if (timeDiff < INACTIVE_TIME) {
      return ActivityStatus.INACTIVE;
    } else if (timeDiff < IDLE_TIME) {
      return ActivityStatus.IDLE;
    } else {
      return ActivityStatus.AWAY;
    }
  }

  public destroy() {
    this.onDisconnect();
  }

  private updateActivityStatus() {
    const status = this.getActivityStatus();
    this.socket.rooms.forEach((roomId) => {
      this.io.to(roomId).emit("activityStatus", getUserId(this.socket), status);
    });
  }

  private updateActivity() {
    const previousStatus = this.getActivityStatus();
    this.lastActivity = Date.now();
    if (previousStatus !== ActivityStatus.ACTIVE) {
      this.updateActivityStatus();
    }
    this.startAutoActivityStatusUpdate();
  }

  private calculateNextActivityStatusUpdate() {
    const now = Date.now();
    const lastActivityTime = this.lastActivity;
    if (lastActivityTime === undefined) {
      return ACTIVE_TIME;
    }
    const timeDiff = now - lastActivityTime;
    if (timeDiff < ACTIVE_TIME) {
      return ACTIVE_TIME - timeDiff;
    } else if (timeDiff < INACTIVE_TIME) {
      return INACTIVE_TIME - timeDiff;
    } else if (timeDiff < IDLE_TIME) {
      return IDLE_TIME - timeDiff;
    } else {
      return 0;
    }
  }

  private startAutoActivityStatusUpdate() {
    if (this.activityStatusUpdateTimeout) {
      clearTimeout(this.activityStatusUpdateTimeout);
    }
    this.activityStatusUpdateTimeout = setTimeout(() => {
      this.updateActivityStatus();
      if (this.getActivityStatus() !== ActivityStatus.AWAY) {
        this.startAutoActivityStatusUpdate();
      }
    }, this.calculateNextActivityStatusUpdate());
  }

  private onPushUpdates = () => {
    this.updateActivity();
  };

  private onDisconnect = () => {
    this.socket.off("disconnect", this.onDisconnect);
    this.socket.off("pushUpdates", this.onPushUpdates);
    this.destroyHandler?.();
  };
}
