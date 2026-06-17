const TICK_DELAY = 50; // milliseconds

const path = require("path");
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const process = require("process");

const gameLogic = require("./public/src/game.js");
const roomsLogic = require("./public/src/rooms.js");

function tick() {
    // console.log(`TICK #${num_ticks}`);
    num_ticks++;

    // restarts the timer
    setTimeout(tick, TICK_DELAY);
}

app.use(express.static(path.join(__dirname, "public")));

// routing
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"))
});
app.get("/game/:roomCode", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "game.html"))
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