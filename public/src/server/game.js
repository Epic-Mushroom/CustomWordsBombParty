import EventEmitter from "events";
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
export const DEFAULT_MIN_PERCENT_WORDS_CONTAINING_SUBSTRING = 0.2;

export const MIN_DICTIONARY_SIZE = 5;

export const DEFAULT_WORD_LIST_FILE = "public/word-lists/default-word-list.txt";
export const CITIES_FILE = "public/word-lists/cities.txt";
export const POKEMON_FILE = "public/word-lists/pokemon.txt";
export const MINECRAFT_FILE = "public/word-lists/minecraft.txt";
export const TERRARIA_FILE = "public/word-lists/terraria.txt";
export const GD_DEMONS_FILE = "public/word-lists/demons.txt";

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
        this.currentLifeCount = gameManager.getGame(this.roomCode).startingLives;
        this.timeoutId = null; // use with setTimeout for the bomb timer
        this.timerStartTime = 0; // epoch time in ms when the timer was started
        this.timerEndTime = 0;
        this.currentAlphabet = new Set();

        this.numCorrectGuesses = 0;
        this.numIncorrectGuesses = 0;
        this.numMisses = 0;

        this.isConnected = true;
        this.playerDisconnectTime = 2 * (new Date()).getTime(); // placeholder value

        this.events = new EventEmitter();
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
        return gameManager.getGame(this.roomCode);
    }

    updateAlphabet(guess /* String */) {
        // called when submitting a correct guess, if alphabet is filled out then we add an extra life
    }

    activateTurn() {
        if (!this.isPlayerAlive || this.currentLifeCount <= 0) {
            throw new GameError("Player is dead!");
        }

        this.resetTimer();
        this.startTimer();

        this.isPlayerTurn = true;

        this.events.emit("started_player_turn");
        console.log(`activated ${this.username}'s turn, substring is ${this.getGame().currentSubstring}`);
    }

    submitGuess(word) {
        console.log(`${this.username} tried to submit ${word}`);

        if (!this.getGame().isActive || !this.isPlayerTurn) {
            return {valid: false, reason: "cannotSubmit"};
        }

        let isGuessRegistered = this.getGame().registerGuess(word, this);

        if (isGuessRegistered.valid) {
            this.numCorrectGuesses++;
            this.endTurn(true);
            return {valid: true, reason: "valid"};

        } else {
            this.numIncorrectGuesses++;
            return {valid: false, reason: isGuessRegistered.reason};
        }
    }

    resetTimer() {
        clearTimeout(this.timeoutId);
        this.timerStartTime = 0;
        this.timerEndTime = 0;
    }

    endTurn(success = false) {
        this.resetTimer()
        console.log(`${this.username}'s turn has ended`);

        if (!success) {
            console.log(`   ${this.username} failed to submit a word in time and has lost a life`);
            this.numMisses++;
            this.currentLifeCount--;

            if (this.currentLifeCount <= 0) {
                this.isPlayerAlive = false;
            }
        }

        // really should be using an event emitter for this
        gameManager.getGame(this.roomCode).nextTurn();
    }

    startTimer() {
        this.timeoutId = setTimeout(() => this.endTurn(), this.getGame().baseTimerDuration * 1000);
        this.timerStartTime = (new Date()).getTime();
        this.timerEndTime = this.timerStartTime + this.getGame().baseTimerDuration * 1000;
    }

    getTimeLeft() {
        // need to change calculation if using variable timer duration in the future
        let curTimeMs = (new Date()).getTime();
        let msSinceStart = (curTimeMs - this.timerStartTime);

        if (msSinceStart >= this.getGame().baseTimerDuration * 1000) {
            return 0;

        } else {
            return this.getGame().baseTimerDuration * 1000 - msSinceStart;

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

        if (this.getGame().isFinished) {
            status = "idle"; // could change this to winner/loser
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
                startingLives = DEFAULT_STARTING_LIVES,
                dictionaryFile = DEFAULT_WORD_LIST_FILE,
                additionalWords = [],
                usePresetDictionary = true) {
        this.roomCode = roomCode;

        this.wordListFile = dictionaryFile;
        this.usesAdditionalWords = additionalWords.length > 0;
        this.additionalWords = additionalWords;
        this.usesPresetWordList = usePresetDictionary;
        if (!this.usesPresetWordList && !this.usesAdditionalWords) {
            throw new GameError("Can't not have a word list");
        }
        this.wordsLoaded = false;

        /**
         * @type {Array<Player>}
         */
        this.players = [];
        this.alphabetRule = new Set();
        this.wordDictionary = new Set();
        this.substrings = new Map();
        this.uniqueSubstrings = 0;

        if (baseTimerDuration <= MAX_BASE_TIMER_DURATION && baseTimerDuration >= MIN_BASE_TIMER_DURATION) {
            this.baseTimerDuration = baseTimerDuration; // could add variation depending on substring rarity
        } else {
            throw new GameError(`Bomb timer duration must be between ${MIN_BASE_TIMER_DURATION} and ${MAX_BASE_TIMER_DURATION} inclusive`);
        }
        if (maxPlayers <= MAX_MAX_PLAYERS_PER_ROOM && maxPlayers >= MIN_MAX_PLAYERS_PER_ROOM) {
            this.maxPlayers = Math.floor(maxPlayers); 
        } else {
            throw new GameError(`Max players must be between ${MIN_MAX_PLAYERS_PER_ROOM} and ${MAX_MAX_PLAYERS_PER_ROOM} inclusive`);
        }
        if (startingLives <= MAX_STARTING_LIVES && startingLives >= MIN_STARTING_LIVES) {
            this.startingLives = Math.ceil(startingLives); 
        } else {
            throw new GameError(`Starting lives must be between ${MIN_STARTING_LIVES} and ${MAX_STARTING_LIVES} inclusive`);
        }

        /**
         * @type {number}
         */
        this.currentRound = 1;
        /**
         * @type {number}
         */
        this.currentTurn = 0; // index of players
        this.currentSubstring = "ION";
        this.wordsSubmitted = new Map();

        this.isActive = false;
        this.isFinished = false;

        this.leader = null; // should just be the first player in the this.players array

        this.gameCreationTime = (new Date()).getTime();

        this.populateWordData();

        // error checking for purely custom lists
        if (!this.usesPresetWordList && this.usesAdditionalWords) {
            if (this.wordDictionary.size < MIN_DICTIONARY_SIZE) {
                throw new GameError(`Number of total words in the custom dictionary cannot be less than ${MIN_DICTIONARY_SIZE}`)
            }

            if (this.substrings.size <= 0) {
                throw new GameError("Could not generate any prompts from the custom word list! Try using longer words");
            }
            
        }

        this.events = new EventEmitter();
    }

    // populates both the word dictionary set and dictionary of substrings and their counts
    populateWordData() {
        console.log(`started adding words to the word dictionary`);

        if (this.usesAdditionalWords) {
            for (const addlWord of this.additionalWords) {
                let word = addlWord.toLowerCase().trim();
                if (word === "") {
                    continue;
                }
                this.wordDictionary.add(word);

                // update substrings set
                this.populateSubstrings(word);
            }
        }

        if (this.usesPresetWordList) {
            try {
                readFile(
                    this.wordListFile, 
                    (line) => {
                        let word = line.toLowerCase().trim();
                        if (word === "") {
                            return;
                        }
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
            
        } else {
            this.wordsLoaded = true;
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

    getRandomSubstring(minSubstringPercent = DEFAULT_MIN_PERCENT_WORDS_CONTAINING_SUBSTRING) {
        return getWeightedRandomElement(this.substrings.keys(), (substring) => {
            let occurrences = this.substrings.get(substring);
            if (occurrences < minSubstringPercent * 0.01 * this.wordDictionary.size) {
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

    /**
     * 
     * @param {string} username 
     * @returns 
     */
    findPlayer(username) {
        return this.players.find((player) => player.username === username);
    }

    lastOneStanding() {
        let count = 0;
        let winner = null;
        for (const player of this.players) {
            if (player.isPlayerAlive) {
                count++;
                winner = player;

                if (count >= 2) {
                    return null;
                }
            }
        }

        if (count === 0) {
            if (this.players.length >= 2) {
                throw new GameError("Somehow, everyone is dead in a non-solo game!");
            } else if (this.players.length === 1) {
                return this.players[0];
            } else {
                throw new GameError("Somehow, this game is empty! How does this even happen");
            }

        } else if (this.players.length === 1) {
            return null;
        }

        return winner;
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

        if (this.isActive) {
            throw new GameError("Game is already started!");
        }

        this.isActive = true;

        console.log(`game with code ${this.roomCode} has begun`);
        this.currentSubstring = this.getRandomSubstring();
        this.players[this.currentTurn].activateTurn();

    }

    nextTurn(skipWinnerCheck = false) {
        // massively prone to infinite loop lol
        if (!skipWinnerCheck && this.lastOneStanding() != null) {
            return this.endGame();
        }

        this.currentTurn++;
        if (this.currentTurn >= this.players.length) {
            this.currentTurn = 0;
        }

        let nextPlayer = this.players[this.currentTurn];
        if (!nextPlayer.isPlayerAlive) {
            return this.nextTurn(true);
        }

        this.currentSubstring = this.getRandomSubstring();
        nextPlayer.activateTurn();
    }

    endGame() {
        this.isActive = false;
        this.isFinished = true;

        let winner = this.lastOneStanding();
        this.events.emit("game_over", winner.username, winner.numCorrectGuesses);
        console.log(`game over, winner is ${winner}`);
    }

    /**
     * 
     * @param {string} guess 
     * @returns 
     */
    isValidGuess(guess) {
        if (!this.wordDictionary.has(guess)) {
            return {valid: false, reason: "notInDictionary"};
        }

        if (!guess.includes(this.currentSubstring)) {
            return {valid: false, reason: "doesNotIncludeSubstring"};
        }

        if (this.wordsSubmitted.has(guess)) {
            return {valid: false, reason: "alreadySubmitted"};
        }

        return {valid: true, reason: "valid"};
    }

    /**
     * 
     * @param {string} guess 
     * @param {Player} player
     * @returns 
     */
    registerGuess(guess, player) {
        let isValid = this.isValidGuess(guess);

        if (!isValid.valid) {
            return {valid: false, reason: isValid.reason};
        }

        this.wordsSubmitted.set(guess, player);
        return {valid: true, reason: "valid"};
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
        /**
         * @type {Map<string, Game>}
         */
        this.games = new Map();
        /**
         * @type {Map<string, Player>}
         */
        this.players = new Map();
    }

    /**
     * 
     * @param {Game} game 
     * @returns 
     */
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

    getGame(roomCode) {
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