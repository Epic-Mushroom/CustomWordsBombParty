import path from "path";
import url from "url";
import process from "process";
import express from "express";
import * as httpModule from "http"; 
import * as socketIo from "socket.io"; 

import * as gameLogic from "./public/src/server/game.js";
import * as roomsLogic from "./public/src/server/rooms.js";

function tick() {
    numTicks++;

    // restarts the timer
    setTimeout(tick, SERVER_TICK_DELAY);
}

const SERVER_TICK_DELAY = 50; // milliseconds
const DIRNAME = path.dirname(url.fileURLToPath(import.meta.url));

const app = express();
const http = httpModule.createServer(app);
const io = new socketIo.Server(http);

let gameManager = new gameLogic.GameManager();

// server tick updates
let numTicks = 0;

const tickInterval = setTimeout(tick, SERVER_TICK_DELAY);

app.use(express.static(path.join(DIRNAME, "public")));

// routing
app.get("/", (req, res) => {
    res.sendFile(path.join(DIRNAME, "public", "index.html"))
});
app.get("/game/:roomCode", (req, res) => {
    res.sendFile(path.join(DIRNAME, "public", "game.html"))
});
app.use((req, res) => {
    res.status(404).sendFile(path.join(DIRNAME, "public", "404.html"));
});

// main socket listeners and emitters
io.on("connection", (socket) => {
    console.log(`player connected, socket id: ${socket.id}`);

    socket.on("disconnect", () => {
        console.log(`player disconnected, socket id: ${socket.id}`);
    });

    // homepage
    socket.emit("update_rooms_count", gameManager.games.size);

    socket.emit("pre_fill_room_rule_defaults");

    socket.on("create_room", (maxPlayers, baseTimerDuration, startingLives) => {
        try {
            let generatedCode = roomsLogic.generateRoomCode();
            let newGame = gameManager.addGame(generatedCode, maxPlayers = maxPlayers, baseTimerDuration = baseTimerDuration, startingLives = startingLives); // uses default constraints for timer length, max players, etc

            socket.emit("show_newly_generated_room", generatedCode);
            io.emit("update_rooms_count", gameManager.games.size);

            console.log(`Generated room with game: ${newGame}`);

        } catch (err) {
            socket.emit("alert", err.message);
        }
        
    });

    // game page
    socket.on("validate_room_code", (roomCode, callback) => {
        callback({validRoom: gameManager.games.has(roomCode)});
    });

    socket.on("submit_guess", () => {
        console.log(`player clicked submit guess`);
    });      
    
});

http.listen(3000, () => console.log("server up"));  