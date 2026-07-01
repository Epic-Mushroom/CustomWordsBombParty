import path from "path";
import url from "url";
import EventEmitter from "events";
import express from "express";
import * as httpModule from "http"; 
import * as socketIo from "socket.io"; 

import {parseCommaOrLineBreakSeparatedValues} from "./public/src/utils.js"
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

function getDictionaryFile(dictionarySelectionId) {
    let dictionaryFile = gameLogic.DEFAULT_WORD_LIST_FILE;

    switch (dictionarySelectionId) {
        case "default-dictionary":
            break;
        case "adjectives":
            dictionaryFile = gameLogic.ADJECTIVES_FILE;
            break;
        case "adverbs":
            dictionaryFile = gameLogic.ADVERBS_FILE;
            break;
        case "cities":
            dictionaryFile = gameLogic.CITIES_FILE;
            break;
        case "pokemon":
            dictionaryFile = gameLogic.POKEMON_FILE;
            break;
        case "minecraft":
            dictionaryFile = gameLogic.MINECRAFT_FILE;
            break;
        case "terraria":
            dictionaryFile = gameLogic.TERRARIA_FILE;
            break;
        case "demons":
            dictionaryFile = gameLogic.GD_DEMONS_FILE;
            break;
        case "custom-dictionary":
            break;
        default:
            break;
    }

    return dictionaryFile;
}

/**
 * 
 * @param {gameLogic.Player} player 
 */
function emitGameplayVisibility(player) {
    let curGame = player.getGame();
    let gameAlphabetArray = Array.from(curGame.bonusAlphabet);

    for (const gamePlayer of curGame.players) {
        io.to(gamePlayer.socketId).emit("gameplay_visibility", {
            isClientTurn: gamePlayer === player,
            curTurnHolderUsername: player.username,
            curSubstring: curGame.currentSubstring,
            endTime: player.timerEndTime,
            showTimeDisplay: curGame.showTimeDisplay,
            playerAlphabetArray: Array.from(gamePlayer.currentAlphabet),
            gameAlphabetArray: gameAlphabetArray
        });
    }
}

function emitPlayerInfoVisibility(roomCode) {
    let game = gameManager.getGame(roomCode);

    let playerData = [];
    for (const player of game.players) {
        playerData.push({
            asString: player.toString(), username: player.username, numCorrectGuesses: player.numCorrectGuesses,
            numIncorrectGuesses: player.numIncorrectGuesses, numMisses: player.numMisses, mostRecentSubstring: player.mostRecentSubstring,
            mostRecentGuess: player.mostRecentGuess, mostRecentGuessStatus: player.mostRecentGuessStatus, 
            curTurnHolderUsername: game.players[game.currentTurn].username, gameIsActive: game.isActive
        })
    }
    
    io.to(roomCode).emit("player_info_visibility", playerData);

    if (!game.isActive && !game.isFinished) {
        io.to(game.leader?.socketId).emit("show_start_game_container", true);
    }
}

function addPlayerToRoom(socket, username, roomCode) {
    // console.log(`trying to add ${username} to ${roomCode}`);
    if (username == "") {
        console.warn(`username is blank`);
    }

    if (!gameManager.games.has(roomCode)) {
        return;
    }

    try {
        const roomGame = gameManager.games.get(roomCode);
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
}

/**
 * 
 * @param {gameLogic.Player} player 
 */
function addPlayerListeners(player) {
    player.events.on("submitted_guess", () => {
        emitPlayerInfoVisibility(player.roomCode);
    });

    player.events.on("started_player_turn", () => {
        emitGameplayVisibility(player);
        // will cause it to emit twice because submitted_guess happens usually right before
        // but this helps to emit at the very beginning of the game, might want to create a different emit
        // for beginning of the game
        emitPlayerInfoVisibility(player.roomCode);
    });

    player.events.on("reconnect", () => {
        if (player.getGame().isActive) {
            emitGameplayVisibility(player);
        }
    });

    player.events.on("ran_out_of_time", async () => {
        // shows contents of user's submit box on running out of time
        let mostRecentGuess = "";

        try {
            const response = (await io.to(player.socketId).timeout(10000).emitWithAck("ran_out_of_time"))[0];
            mostRecentGuess = response.submissionBoxContent?.trim().toLowerCase();

        } catch (err) {
            console.log(`error upon waiting for response from client: ${err.message}`);

        } finally {
            if (mostRecentGuess === "") {
                mostRecentGuess = player.mostRecentGuess;
            }

            player.mostRecentGuess = mostRecentGuess;
            emitPlayerInfoVisibility(player.roomCode);

        }
    });
}

/**
 * 
 * @param {gameLogic.Game} game 
 */
function addGameListeners(game) {
    game.events.on("game_over", (winnerUsername, winnerCorrectGuesses) => {
        io.to(game.roomCode).emit("show_winner", winnerUsername, winnerCorrectGuesses);
    })
}

const SERVER_TICK_DELAY = 50; // milliseconds
const DIRNAME = path.dirname(url.fileURLToPath(import.meta.url));

// set up server and sockets
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
        gameLogic.DEFAULT_STARTING_LIVES,
        Array.from(gameLogic.DEFAULT_BONUS_ALPHABET)
    );

    socket.on("request_room_rule_defaults", () => socket.emit(
        "pre_fill_room_rule_defaults", 
        gameLogic.DEFAULT_MAX_PLAYERS_PER_ROOM, 
        gameLogic.DEFAULT_BASE_TIMER_DURATION, 
        gameLogic.DEFAULT_STARTING_LIVES,
        Array.from(gameLogic.DEFAULT_BONUS_ALPHABET)
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
        username,
        maxPlayers = gameLogic.DEFAULT_MAX_PLAYERS_PER_ROOM,
        baseTimerDuration = gameLogic.DEFAULT_BASE_TIMER_DURATION,
        startingLives = gameLogic.DEFAULT_STARTING_LIVES,
        dictionarySelectionId = "default-dictionary",
        additionalWordsInput = "",
        usePresetDictionary = true,
        bonusAlphabet = gameLogic.DEFAULT_BONUS_ALPHABET
    ) => {
        try {
            const generatedCode = roomsLogic.generateRoomCode();
            const dictionaryFile = getDictionaryFile(dictionarySelectionId);

            const additionalWords = parseCommaOrLineBreakSeparatedValues(additionalWordsInput);

            if (additionalWords.length === 0) {
                usePresetDictionary = true;
            }

            const newGame = new gameLogic.Game(
                generatedCode, parseFloat(maxPlayers), parseFloat(baseTimerDuration), parseFloat(startingLives),
                dictionaryFile, additionalWords, usePresetDictionary, bonusAlphabet
            );
            gameManager.addGame(newGame);
            addGameListeners(newGame);

            addPlayerToRoom(socket, username, generatedCode);

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
        addPlayerToRoom(socket, username, roomCode);

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
        let submittedGuess = player.submitGuess(guess.toLowerCase().trim());
        callback({failure: !submittedGuess.valid, reason: submittedGuess.reason});
    });      
    
});

// server listeners (EventEmitter)
eventManager.on("one_second_tick", (numTicks) => {
    // console.log("one second tick");

    for (const key of gameManager.games.keys()) {
        emitPlayerInfoVisibility(key);
    }
});

eventManager.on("five_second_tick", (numTicks) => {
    // clears empty and inactive rooms
    gameManager.removeInactiveGames();
    io.emit("update_rooms_count", gameManager.games.size)
});

http.listen(3000, () => console.log("server up"));  