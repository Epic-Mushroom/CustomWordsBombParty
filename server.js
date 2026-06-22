import path from "path";
import url from "url";
import EventEmitter from "events";
import process from "process";
import express from "express";
import * as httpModule from "http"; 
import * as socketIo from "socket.io"; 

import * as gameLogic from "./public/src/server/game.js";
import {gameManager} from "./public/src/server/game.js";
import * as roomsLogic from "./public/src/server/rooms.js";

class ServerError extends Error {
    constructor(message) {
        super(message);
        this.name = "ServerError";
    }
}

/**
 * 
 * @param {bigint} numTicks 
 */
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

/**
 * 
 * @param {gameLogic.Player} player 
 */
function addPlayerListeners(player) {
    player.events.on("started_player_turn", () => {
        let curGame = player.getGame();

        for (const gamePlayer of curGame.players) {
            io.to(gamePlayer.socketId).emit("gameplay_visibility", gamePlayer === player, player.username, curGame.currentSubstring, player.timerEndTime);
        }
    });
}

/**
 * 
 * @param {gameLogic.Game} game 
 */
function addGameListeners(game) {
    game.events.on("game_over", (winnerUsername) => {
        io.to(game.roomCode).emit("show_winner", winnerUsername);
    })
}

const SERVER_TICK_DELAY = 50; // milliseconds
const DIRNAME = path.dirname(url.fileURLToPath(import.meta.url));

const app = express();
const http = httpModule.createServer(app);
const io = new socketIo.Server(http);

const eventManager = new EventEmitter();

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
        let player = gameManager.players.get(socket.id);
        if (player != null) {
            player.disconnect();
            gameManager.removePlayer(socket.id);
        }

        console.log(`player disconnected, socket id: ${socket.id}`);
    });

    socket.on("join_io_room", (ioRoomCode, callback) => {
        socket.join(ioRoomCode);
        callback(); 
});

    // homepage
    socket.emit("update_rooms_count", gameManager.games.size);

    socket.emit(
        "pre_fill_room_rule_defaults", 
        gameLogic.DEFAULT_MAX_PLAYERS_PER_ROOM, 
        gameLogic.DEFAULT_BASE_TIMER_DURATION, 
        gameLogic.DEFAULT_STARTING_LIVES
    );

    socket.on("request_room_rule_defaults", () => socket.emit(
        "pre_fill_room_rule_defaults", 
        gameLogic.DEFAULT_MAX_PLAYERS_PER_ROOM, 
        gameLogic.DEFAULT_BASE_TIMER_DURATION, 
        gameLogic.DEFAULT_STARTING_LIVES
    ));

    socket.on("set_server_username", (newUsername, callback) => {
        // for setting the username attribute of the player object on the server end
        let foundPlayer = gameManager.findPlayerBySocketId(socket.id); 
        let playerGame = gameManager.games.get(foundPlayer?.roomCode);

        if (foundPlayer != null) {
            let existingPlayerWithSameName = playerGame.findPlayer(newUsername);
            if (existingPlayerWithSameName != null && existingPlayerWithSameName.socketId != foundPlayer.socketId) {
                callback({"usernameSet": false});

            } else {
                foundPlayer.username = newUsername;

            }
        }

        callback({"usernameSet": true});
    });

    socket.on("create_room", (
        maxPlayers = gameLogic.DEFAULT_MAX_PLAYERS_PER_ROOM,
        baseTimerDuration = gameLogic.DEFAULT_BASE_TIMER_DURATION,
        startingLives = gameLogic.DEFAULT_STARTING_LIVES
    ) => {
        try {
            let generatedCode = roomsLogic.generateRoomCode();
            let newGame = new gameLogic.Game(generatedCode, maxPlayers, baseTimerDuration, startingLives)
            gameManager.addGame(newGame);
            addGameListeners(newGame);

            socket.emit("show_newly_generated_room", generatedCode);
            io.emit("update_rooms_count", gameManager.games.size);

            console.log(`generated room with game: ${newGame}`);

        } catch (err) {
            socket.emit("alert", err.message);
        }
        
    });

    // game page
    socket.on("validate_room_code", (roomCode, callback) => {
        callback({validRoom: gameManager.games.has(roomCode)});
    });

    socket.on("add_player_to_room", (username, roomCode) => {
        // console.log(`trying to add ${username} to ${roomCode}`);
        if (username == "") {
            console.warn(`username is blank`);
        }

        if (!gameManager.games.has(roomCode)) {
            return;
        }

        try {
            let roomGame = gameManager.games.get(roomCode);
            let newPlayer = new gameLogic.Player(username, roomCode, socket.id);

            console.log(`created Player with username ${newPlayer.username}`);

            newPlayer = roomGame.addOrUpdatePlayer(newPlayer);
            gameManager.addPlayer(newPlayer);
            addPlayerListeners(newPlayer);

            if (newPlayer.username != username) {
                socket.emit("force_username_update", newPlayer.username);
            }

        } catch (err) {
            if (err.name != "GameError") {
                throw err;

            } else {
                socket.emit("alert_with_redirect", err.message);

            }
        }

    })

    socket.on("start_game", (callback) => {
        let player = gameManager.findPlayerBySocketId(socket.id);
        /**
         * @type {{started : boolean, message : string}}
         */
        let callbackResponse = {started : false, message : ""};

        try {
            if (player?.isGameLeader()) {
                gameManager.getGame(player.roomCode).startGame();
                callbackResponse.started = true;

            } else {
                callbackResponse.message = "You aren't this game's room host!";
            }

        } catch (err) {
            callbackResponse.message = err.message;

        } finally {
            callback(callbackResponse)
        }
    });

    socket.on("submit_guess", (guess, callback) => {
        const player = gameManager.findPlayerBySocketId(socket.id);
        callback({failure : !player.submitGuess(guess.toLowerCase().trim())});
    });      
    
});

// server listeners (EventEmitter)
eventManager.on("one_second_tick", (numTicks) => {
    // console.log("one second tick");

    for (const [key, value] of gameManager.games) {
        io.to(key).emit("update_player_info", value.players.map((player) => player.toString()), value.players.map((player) => player.username));

        if (!value.isActive && !value.isFinished) {
            io.to(value.leader?.socketId).emit("show_start_game_container", true);
        }
    }
});

eventManager.on("five_second_tick", (numTicks) => {
    // clears empty and inactive rooms
    gameManager.removeInactiveGames();
    io.emit("update_rooms_count", gameManager.games.size)
});

http.listen(3000, () => console.log("server up"));  