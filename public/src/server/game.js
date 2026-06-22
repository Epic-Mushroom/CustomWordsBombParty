import {readFile, getRandomInt, getWeightedRandomElement} from "../utils.js";

const RANDOM_USERNAME_SUFFIX_CHARACTERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const RANDOM_USERNAME_SUFFIX_MIN_LENGTH = 6;
const RANDOM_USERNAME_SUFFIX_MAX_LENGTH = 7;
const RANDOM_USERNAME_PREFIXES = [
    "Gertrude",
    "Bartholomew"
]

export const DEFAULT_BASE_TIMER_DURATION = 8; // seconds
export const DEFAULT_MAX_PLAYERS_PER_ROOM = 10;
export const DEFAULT_STARTING_LIVES = 3;
export const DEFAULT_MIN_WORDS_PER_SUBSTRING = 100; // should convert this into a percent to account for different sizes of wordlists

export const MAX_BASE_TIMER_DURATION = 67;
export const MAX_MAX_PLAYERS_PER_ROOM = 67;
export const MAX_STARTING_LIVES = 10;

export const MIN_BASE_TIMER_DURATION = 1;
export const MIN_MAX_PLAYERS_PER_ROOM = 1;
export const MIN_STARTING_LIVES = 1;

export const SECONDS_UNTIL_GAME_IS_OLD = 600;

export const SUBSTRING_LENGTHS = [2, 3];

class GameError extends Error {
    constructor(message) {
        super(message);
        this.name = "GameError";
    }
}

export class Player {
    // has a username, a game that it is connected to, number of lives,
    // current timer value, alphabet matched to the game's alphabet rule (make sure not to update after getting extra life),
    // if it's the player's turn, if the player is alive

    constructor(username, gameRoomCode, socketId = null) {
        if (username != null || username === "") {
            this.username = username;
        } else {
            this.username = Player.generateUsername();
        }
        this.roomCode = gameRoomCode;
        this.socketId = socketId;

        this.isPlayerTurn = false;
        this.isPlayerAlive = true;
        this.currentLifeCount = gameManager.findGame(this.roomCode).startingLives;
        this.timeoutId = null; // use with setTimeout for the bomb timer
        this.timerStartTime = 0; // epoch time in ms when the timer was started
        this.currentAlphabet = new Set();

        this.isConnected = true;
        this.playerDisconnectTime = 2 * (new Date()).getTime(); // placeholder value
    }

    static generateUsername() {
        let generatedUsername = "";

        generatedUsername += RANDOM_USERNAME_PREFIXES[getRandomInt(0, RANDOM_USERNAME_PREFIXES.length - 1)];
        generatedUsername += "_";
        let suffixLength = getRandomInt(RANDOM_USERNAME_SUFFIX_MIN_LENGTH, RANDOM_USERNAME_SUFFIX_MAX_LENGTH);
        for (let i = 0; i < suffixLength; i++) {
            generatedUsername += RANDOM_USERNAME_SUFFIX_CHARACTERS[getRandomInt(0, RANDOM_USERNAME_SUFFIX_CHARACTERS.length - 1)];
        }

        return generatedUsername;
    }

    getGame() {
        return gameManager.findGame(this.roomCode);
    }

    updateAlphabet(guess /* String */) {
        // called when submitting a correct guess, if alphabet is filled out then we add an extra life
    }

    activatePlayerTurn() {
        if (!this.isPlayerAlive || this.currentLifeCount <= 0) {
            throw new GameError("Player is dead!");
        }

        this.resetTimer();
        this.startTimer();

        this.isPlayerTurn = true;
    }

    submitGuess(word) {
        if (this.getGame().isValidGuess(word)) {
            this.endPlayerTurn(true);
            return true;

        } else {
            return false;
        }
    }

    endPlayerTurn(success = false) {
        this.resetTimer()
    }

    resetTimer() {
        clearTimeout(this.timeoutId);
        this.timerStartTime = 0;
    }

    startTimer() {
        this.timeoutId = setTimeout(this.endPlayerTurn, this.getGame().baseTimerDuration * 1000);
        this.timerStartTime = (new Date()).getTime();
    }

    getTimeLeft() {
        // need to change calculation if using variable timer duration in the future
        let timeSinceStart = ((new Date()).getTime() - this.timerStartTime);

        if (timeSinceStart >= this.getGame().baseTimerDuration * 1000) {
            return 0;

        } else {
            return this.getGame().baseTimerDuration - timeSinceStart;

        }
    }

    reconnect(newSocketId) {
        this.isConnected = true;
        this.socketId = newSocketId;
        this.playerDisconnectTime = 2 * (new Date()).getTime();
    }

    disconnect() {
        this.isConnected = false;
        // this.socketId = null;
        this.playerDisconnectTime = (new Date()).getTime();
    }

    isGameLeader() {
        return this.getGame().leader === this;
    }

    toString() {
        let crown = (this.isGameLeader()) ? "👑 " : "";

        let status = "in-game";

        if (!this.getGame().isActive) {
            status = "ready";
        }

        if (!this.isConnected) {
            status = "disconnected";
        }

        if (!this.isPlayerAlive) {
            status = "dead";
        }

        let livesDisplay = "";
        for (let i = 0; i < Math.min(this.currentLifeCount, this.getGame().startingLives); i++) {
            livesDisplay += "❤️";
        }
        for (let i = 0; i < this.getGame().startingLives - this.currentLifeCount; i++) {
            livesDisplay += "🩶";
        }
        for (let i = 0; i < this.currentLifeCount - this.getGame().startingLives; i++) {
            livesDisplay += "💛";
        }

        return `${crown}${this.username} ${livesDisplay} (${status})`;
    }
}

export class Game {
    // has an array of players, set that is the dictionary of words,
    // dictionary of substrings mapped to count, dictionary of words already done (key: word, value: player), 
    // room code, alphabet rule (set of letters) for generating extra lives (later, for gd, may want to use demon diffs instead)
    // max timer length, maxPlayers, starting life count, current round number, current player turn, isActive

    constructor(roomCode, maxPlayers = DEFAULT_MAX_PLAYERS_PER_ROOM,
                baseTimerDuration = DEFAULT_BASE_TIMER_DURATION, 
                startingLives = DEFAULT_STARTING_LIVES) {
        this.roomCode = roomCode;
        
        this.usesPresetWordList = true;
        this.wordListFile = "public/word-lists/default-word-list.txt";
        this.wordsLoaded = false;

        this.players = [];
        this.alphabetRule = new Set();
        this.wordDictionary = new Set();
        this.substrings = new Map();
        this.uniqueSubstrings = 0;

        if (baseTimerDuration <= MAX_BASE_TIMER_DURATION && baseTimerDuration >= MIN_BASE_TIMER_DURATION) {
            this.baseTimerDuration = baseTimerDuration; // could add variation depending on substring rarity
        } else {
            throw new Error(`Bomb timer duration must be between ${MIN_BASE_TIMER_DURATION} and ${MAX_BASE_TIMER_DURATION} inclusive`);
        }
        if (maxPlayers <= MAX_MAX_PLAYERS_PER_ROOM && maxPlayers >= MIN_MAX_PLAYERS_PER_ROOM) {
            this.maxPlayers = Math.floor(maxPlayers); 
        } else {
            throw new Error(`Max players must be between ${MIN_MAX_PLAYERS_PER_ROOM} and ${MAX_MAX_PLAYERS_PER_ROOM} inclusive`);
        }
        if (startingLives <= MAX_STARTING_LIVES && startingLives >= MIN_STARTING_LIVES) {
            this.startingLives = Math.ceil(startingLives); 
        } else {
            throw new Error(`Starting lives must be between ${MIN_STARTING_LIVES} and ${MAX_STARTING_LIVES} inclusive`);
        }

        this.currentRound = 1;
        this.currentSubstring = "ION";
        this.wordsSubmitted = new Map();

        this.isActive = false;

        this.leader = null; // should just be the first player in the this.players array

        this.gameCreationTime = (new Date()).getTime();

        this.populateWordData();
    }

    // populates both the word dictionary set and dictionary of substrings and their counts
    populateWordData() {
        console.log(`started adding words to the word dictionary`);

        try {
            readFile(
                this.wordListFile, 
                (line) => {
                    let word = line.trim();
                    this.wordDictionary.add(word);

                    // update substrings set
                    this.populateSubstrings(word);
                },
                () => {
                    // console.log(`finished adding ${this.wordDictionary.size} words to the word dictionary`);
                    // console.log(`substring "ass" has ${this.substrings.get("ass")} occurrences`);
                    // console.log(`number of unique substrings: ${this.uniqueSubstrings}`);
                    // for (let i = 0; i < 50; i++) {
                    //     let randSubstring = this.getRandomSubstring();
                    //     console.log(`${randSubstring}: ${this.substrings.get(randSubstring)}`);
                    // }

                    this.wordsLoaded = true;
                }
            );

        } catch (err) {
            console.error(`Something happened when trying to read the word list file (${err})`);

        }
    }

    populateSubstrings(word) {
        for (const substringLength of SUBSTRING_LENGTHS) {
            for (let i = 0; i <= word.length - substringLength; i++) {
                let curSubstring = word.substring(i, i + substringLength).toLowerCase();
                let curSubstringCount = 0;
                if (this.substrings.get(curSubstring) == null) {
                    this.uniqueSubstrings++;
                } else {
                    curSubstringCount = this.substrings.get(curSubstring);
                }
                this.substrings.set(curSubstring, curSubstringCount + 1);

            }
        }
    }

    getRandomSubstring(minWordsPerSubstring = DEFAULT_MIN_WORDS_PER_SUBSTRING) {
        return getWeightedRandomElement(this.substrings.keys(), (substring) => {
            let occurrences = this.substrings.get(substring);
            if (occurrences < minWordsPerSubstring) {
                return 0;
            } else {
                return occurrences;
            }
        });
    }

    addOrUpdatePlayer(player) {
        if (this.players.length >= this.maxPlayers) {
            throw new GameError("This room is full!");
        }

        let existingPlayer = this.findPlayer(player.username);

        if (existingPlayer?.isConnected) {
            throw new GameError("There is already another player in this room with the same username!");

        } else if (existingPlayer != null) {
            existingPlayer.reconnect(player.socketId);
            return existingPlayer;
        }

        this.players.push(player);

        if (this.leader == null) {
            this.leader = player;
        }

        return player;
    }

    isDeadLobby() {
        for (const player of this.players) {
            if (player.isConnected) {
                return false;
            }
        }

        // don't want to mark newly made rooms as dead
        return this.isOld();
    }

    findPlayer(username) {
        return this.players.find((player) => player.username === username);
    }

    startGame() {
        if (this.players.length === 0) {
            throw new GameError("There are no players in this room!");
            
        } else if (this.players.length > this.maxPlayers) {
            throw new GameError("There are too many players in this room!");
        }

        if (!this.wordsLoaded) {
            throw new GameError("Still loading words!");
        }

        // ...

        this.isActive = true;

    }

    nextTurn() {

    }

    nextRound() {

    }

    isValidGuess(guess) {
        return guess.includes(this.currentSubstring);
    }

    getSecondsSinceCreation() {
        return ((new Date()).getTime() - this.gameCreationTime) / 1000;
    }

    isOld() {
        return this.getSecondsSinceCreation() >= SECONDS_UNTIL_GAME_IS_OLD;
    }

    toString() {
        return `Code: ${this.roomCode}, Maximum Players: ${this.maxPlayers}, Base Timer Duration: ${this.baseTimerDuration}, 
Starting Lives: ${this.startingLives}`;
    }
}

export class GameManager {
    // contains all the games as a map with key being the room code
    // also contains all created Players as a map with key being socket id
    // disconnected socket ids should be deleted
    // players should only be created upon entering a room

    constructor() {
        this.games = new Map();
        this.players = new Map();
    }

    // should probably make this consistent with addPlayer, as in have the caller create the Game object and pass
    // that in
    addGame(game) {
        this.games.set(game.roomCode, game);

        return game;
    }

    numGames() {
        return this.games.size;
    }

    numActiveGames() {
        return Array.from(this.games.keys()).filter((key) => this.games.get(key).isActive).length;
    }

    findGame(roomCode) {
        return this.games.get(roomCode);
    }

    removeGame(roomCode) {
        return this.games.delete(roomCode);
    }

    removeInactiveGames() {
        for (const [roomCode, game] of this.games) {
            if (game.isDeadLobby()) {
                this.removeGame(roomCode);
    
                console.log(`deleted game with room code ${roomCode}`);
            }
            
        }
    }

    addPlayer(player) {
        if (player.socketId == null) {
            throw Error("Can't add a player with null socket ID to the playerbase");
        }

        this.players.set(player.socketId, player);

        return player;
    }

    findPlayersByUsername(username) {
        let foundPlayers = new Array();

        for (const [id, player] of this.players) {
            if (player.username === username) {
                foundPlayers.push(player);
            }
        }

        return foundPlayers;
    }

    findPlayerBySocketId(socketId) {
        for (const [id, player] of this.players) {
            if (id === socketId) {
                return player;
            }
        }

        return null;
    }

    removePlayer(socketId) {
        return this.players.delete(socketId);
    }
}

// for use by server.js
export const gameManager = new GameManager();