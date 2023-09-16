"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUpdatesRepository = void 0;
const redis_om_1 = require("redis-om");
const updates_schema_1 = require("../schemas/updates.schema");
const getUpdatesRepository = () => __awaiter(void 0, void 0, void 0, function* () {
    let client = yield new redis_om_1.Client().open();
    let repository = client.fetchRepository(updates_schema_1.updates);
    yield repository.createIndex();
    return {
        repository,
        getByRoomId(roomId) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield repository.search().where("roomId").eq(roomId).returnFirst();
            });
        },
        updateByRoomId(roomId) {
            return __awaiter(this, void 0, void 0, function* () {
                const update = yield repository.search().where("roomId").eq(roomId).returnFirst();
                console.log(update);
            });
        },
    };
});
exports.getUpdatesRepository = getUpdatesRepository;
