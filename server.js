import path from "path";
import url from "url";
import EventEmitter from "events";
import process from "process";
import express from "express";
import * as httpModule from "http"; 
import * as socketIo from "socket.io"; 

import * as gameLogic from "./public/src/server/game.js";
import * as roomsLogic from "./public/src/server/rooms.js";

function tick(numTicks) {
    let newTicks = numTicks + 1;
    // console.log(`Tick #${newTicks}`);

    if (newTicks % 20 == 0) {
        eventManager.emit("one_second_tick", newTicks);
    }

    if (newTicks % 100 == 0) {
        eventManager.emit("five_second_tick", newTicks);
    }

    // restarts the timer
    tickInterval = setTimeout(() => {
        tick(newTicks);
    }, SERVER_TICK_DELAY);
}

const SERVER_TICK_DELAY = 50; // milliseconds
const DIRNAME = path.dirname(url.fileURLToPath(import.meta.url));

const app = express();
const http = httpModule.createServer(app);
const io = new socketIo.Server(http);

let eventManager = new EventEmitter();
let gameManager = new gameLogic.GameManager();

// server tick updates
let tickInterval = setTimeout(() => {
    tick(0);
}, SERVER_TICK_DELAY);

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

    socket.on("join_io_room", (ioRoomCode, callback) => {
        socket.join(ioRoomCode);
        callback();
});

    // homepage
    socket.emit("update_rooms_count", gameManager.games.size);

    socket.emit("pre_fill_room_rule_defaults");

    socket.on("set_username", (username) => socket.username = username);

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

    socket.on("add_player_to_room", (username, roomCode) => {
        if (!gameManager.games.has(roomCode)) {
            return;
        }

        try {
            let roomGame = gameManager.games.get(roomCode);
            let newPlayer = new gameLogic.Player(username, roomGame, socket.id);

            roomGame.addOrUpdatePlayer(newPlayer);
            gameManager.addPlayer(newPlayer);

        } catch (err) {
            if (err.name != "GameError") {
                throw err;

            } else {
                socket.emit("alert_with_redirect", err.message);

            }
        }

    })

    socket.on("submit_guess", () => {
        console.log(`player clicked submit guess`);
    });      
    
});

// server listeners (EventEmitter)
eventManager.on("one_second_tick", (numTicks) => {
    // console.log("one second tick");

    for (const [key, value] of gameManager.games) {
        io.to(key).emit("update_player_info", value.players.map((player) => player.toString()));
    }
});

eventManager.on("five_second_tick", (numTicks) => {
    // clears empty and inactive rooms
    for (const [roomCode, game] of gameManager.games) {
        if (game.isOld() && game.players.length == 0) {
            gameManager.removeGame(roomCode);
            io.emit("update_rooms_count", gameManager.games.size);

            console.log(`deleted game with room code ${roomCode}`);
        }
        
    }
});

http.listen(3000, () => console.log("server up"));  