import { Entity, Schema, Client, Repository } from "redis-om";
import { updates } from "../schemas/updates.schema";

export const getUpdatesRepository = async () => {
  let client = await new Client().open();
  let repository = client.fetchRepository(updates);
  await repository.createIndex();
  return {
    repository,
    async getByRoomId(roomId: string) {
      return await repository.search().where("roomId").eq(roomId).returnFirst();
    },
    async updateByRoomId(roomId: string) {
      const update = await repository.search().where("roomId").eq(roomId).returnFirst();
      console.log(update);
    },
  };
};
