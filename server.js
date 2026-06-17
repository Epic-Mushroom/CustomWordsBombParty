import path from "path";
import url from "url";
import process from "process";
import express from "express";
import * as httpModule from "http"; 
import * as socketIo from "socket.io"; 

import * as gameLogic from "./public/src/server/game.js";
import * as roomsLogic from "./public/src/server/rooms.js";

function tick() {
    // console.log(`TICK #${num_ticks}`);
    num_ticks++;

    // restarts the timer
    setTimeout(tick, SERVER_TICK_DELAY);
}

const SERVER_TICK_DELAY = 50; // milliseconds
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

const tick_interval = setTimeout(tick, SERVER_TICK_DELAY);

// main socket listeners and emitters
io.on("connection", (socket) => {
    console.log(`player connected, socket id: ${socket.id}`);

    socket.emit("fetch_rooms_list", Array.from(gameManager.games.keys()));

    socket.emit("pre_fill_room_rule_defaults");

    socket.on("disconnect", () => {
        console.log(`player disconnected, socket id: ${socket.id}`);
    });

    socket.on("create_room", (maxPlayers, baseTimerDuration, startingLives) => {
        let generated_code = roomsLogic.generateRoomCode();
        let newGame = gameManager.addGame(generated_code, maxPlayers, baseTimerDuration, startingLives); // uses default constraints for timer length, max players, etc

        io.emit("show_newly_generated_room", generated_code);
        io.emit("update_rooms_list", generated_code);

        console.log(`Generated room with game: ${newGame}`);
    });

    socket.on("submit_guess", () => {
        console.log(`player clicked submit guess`);
    });
});

http.listen(3000, () => console.log("server up"));  