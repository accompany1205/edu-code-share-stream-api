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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const state_1 = require("@codemirror/state");
dotenv_1.default.config();
const port = process.env.PORT || 8000;
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
app.use((0, cors_1.default)({
    origin: "*",
}));
let updates = {};
// The current document
let doc = {};
let pending = {};
const getRoomId = (socket) => Array.from(socket.rooms)[1];
const io = new socket_io_1.Server(server, {
    path: "/",
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});
io.on("connection", (socket) => __awaiter(void 0, void 0, void 0, function* () {
    // student can use it only
    socket.on("create", (roomId) => {
        console.log(roomId, "SET ROOM ID");
        doc[roomId] = state_1.Text.of([""]);
        updates[roomId] = [];
        socket.join(roomId);
    });
    socket.on("deleteRoom", (roomId) => {
        socket.leave(roomId);
        delete doc[roomId];
        delete updates[roomId];
        delete pending[roomId];
    });
    // --------------------------
    // manager can use it only
    socket.on("joinRoom", (roomId) => {
        socket.join(roomId);
    });
    socket.on("leaveRoom", (roomId) => {
        socket.leave(roomId);
    });
    // --------------------------
    socket.on("pullUpdates", (version) => {
        var _a, _b;
        const roomId = getRoomId(socket);
        if (+version < (+((_a = updates[roomId]) === null || _a === void 0 ? void 0 : _a.length) || 0)) {
            // @ts-ignore
            socket.emit("pullUpdateResponse", JSON.stringify(((_b = updates[roomId]) === null || _b === void 0 ? void 0 : _b.slice(version)) || []));
        }
        else {
            if (!pending[roomId])
                pending[roomId] = [];
            pending[roomId].push((updates) => {
                socket.emit("pullUpdateResponse", JSON.stringify(updates || []));
            });
        }
    });
    socket.on("pushUpdates", (version, docUpdates) => {
        var _a, _b, _c, _d;
        const roomId = getRoomId(socket);
        docUpdates = JSON.parse(docUpdates);
        try {
            console.log("UPDATE_DATA");
            console.table({
                roomId,
                version,
                length: (_a = updates[roomId]) === null || _a === void 0 ? void 0 : _a.length,
                updated: version == ((_b = updates[roomId]) === null || _b === void 0 ? void 0 : _b.length),
            });
            if (version != ((_c = updates[roomId]) === null || _c === void 0 ? void 0 : _c.length)) {
                socket.emit("pushUpdateResponse", false);
            }
            else {
                for (let update of docUpdates) {
                    // Convert the JSON representation to an actual ChangeSet
                    // instance
                    let changes = state_1.ChangeSet.fromJSON(update.changes);
                    // @ts-ignore
                    (_d = updates[roomId]) === null || _d === void 0 ? void 0 : _d.push({ changes, clientID: update.clientID });
                    doc[roomId] = changes.apply(doc[roomId]);
                }
                socket.emit("pushUpdateResponse", true);
                while (pending[roomId].length)
                    pending[roomId].pop()(docUpdates);
            }
        }
        catch (error) {
            console.error(error);
        }
    });
    socket.on("end", function () {
        socket.disconnect(true);
    });
    socket.on("getDocument", () => {
        var _a, _b;
        const roomId = getRoomId(socket);
        if (!updates[roomId]) {
            updates[roomId] = [];
        }
        socket.emit("getDocumentResponse", ((_a = updates[roomId]) === null || _a === void 0 ? void 0 : _a.length) || 0, (_b = doc[roomId]) === null || _b === void 0 ? void 0 : _b.toString());
    });
}));
app.get("/health", (req, res) => {
    res.send("healthy");
});
server.listen(port, () => {
    console.log(`listening on port http://localhost:${port}`);
});
