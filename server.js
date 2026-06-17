import path from "path";
import url from "url";
import process from "process";
import express from "express";
import * as httpModule from "http"; 
import * as socketIo from "socket.io"; 

import * as gameLogic from "./public/src/game.js";
import * as roomsLogic from "./public/src/rooms.js";

function tick() {
    // console.log(`TICK #${num_ticks}`);
    num_ticks++;

    // restarts the timer
    setTimeout(tick, TICK_DELAY);
}

const TICK_DELAY = 50; // milliseconds
const DIRNAME = path.dirname(url.fileURLToPath(import.meta.url));

const app = express();
const http = httpModule.createServer(app);
const io = new socketIo.Server(http);

app.use(express.static(path.join(DIRNAME, "public")));

// routing
app.get("/", (req, res) => {
    res.sendFile(path.join(DIRNAME, "public", "index.html"))
});
app.get("/game/:roomCode", (req, res) => {
    res.sendFile(path.join(DIRNAME, "public", "game.html"))
});

let gameManager = new gameLogic.GameManager();

// server tick updates
let num_ticks = 0;

const tick_interval = setTimeout(tick, TICK_DELAY);

// main socket listeners and emitters
io.on("connection", (socket) => {
    console.log(`player connected, socket id: ${socket.id}`);

    socket.emit("fetch_rooms_list", Array.from(gameManager.games.keys()));

    socket.emit(
        "pre_fill_room_rule_defaults", 
        gameLogic.DEFAULT_MAX_PLAYERS_PER_ROOM,
        gameLogic.DEFAULT_BASE_TIMER_DURATION,
        gameLogic.DEFAULT_STARTING_LIVES
    );

    socket.on("disconnect", () => {
        console.log(`player disconnected, socket id: ${socket.id}`);
    });

    socket.on("create_room", () => {
        let generated_code = roomsLogic.generateRoomCode();
        gameManager.addGame(generated_code); // uses default constraints for timer length, max players, etc

        io.emit("update_rooms_list", generated_code);

        console.log(`room code generated with code ${generated_code}`);
    });

    socket.on("submit_guess", () => {
        console.log(`player clicked submit guess`);
    });
});

http.listen(3000, () => console.log("server up"));  