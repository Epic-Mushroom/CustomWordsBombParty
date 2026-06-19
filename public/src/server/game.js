export const DEFAULT_BASE_TIMER_DURATION = 8; // seconds
export const DEFAULT_MAX_PLAYERS_PER_ROOM = 10;
export const DEFAULT_STARTING_LIVES = 3;

export const MAX_BASE_TIMER_DURATION = 67;
export const MAX_MAX_PLAYERS_PER_ROOM = 67;
export const MAX_STARTING_LIVES = 10;

export const MIN_BASE_TIMER_DURATION = 1;
export const MIN_MAX_PLAYERS_PER_ROOM = 1;
export const MIN_STARTING_LIVES = 1;

export const SECONDS_UNTIL_GAME_IS_OLD = 360;

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

    constructor(username, game /* Game */) {
        if (username != null) {
            this.username = username;
        } else {
            this.username = "Gertrude";
        }
        this.game = game;

        this.isPlayerTurn = false;
        this.isPlayerAlive = true;
        this.currentLifeCount = game.startingLives;
        this.timeoutId = null; // use with setTimeout for the bomb timer
        this.timerStartTime = 0; // epoch time in ms when the timer was started
        this.currentAlphabet = new Set();

        this.isPlayerConnected = true;
        this.playerDisconnectTime = 2 * (new Date()).getTime(); // placeholder value
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
        if (this.game.isValidGuess(word)) {
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
        this.timeoutId = setTimeout(this.endPlayerTurn, this.game.baseTimerDuration * 1000);
        this.timerStartTime = (new Date()).getTime();
    }

    getTimeLeft() {
        // need to change calculation if using variable timer duration in the future
        let timeSinceStart = ((new Date()).getTime() - this.timerStartTime);

        if (timeSinceStart >= this.game.baseTimerDuration * 1000) {
            return 0;

        } else {
            return this.game.baseTimerDuration - timeSinceStart;

        }
    }

    isGameLeader() {
        return this.game.leader === this;
    }

    toString() {
        let crown = (this.isGameLeader()) ? "👑 " : "";

        let status = "in-game";

        if (!this.game.isActive) {
            status = "ready";
        }

        if (!this.isPlayerConnected) {
            status = "disconnected";
        }

        if (!this.isPlayerAlive) {
            status = "dead";
        }

        let livesDisplay = "";
        for (let i = 0; i < Math.min(this.currentLifeCount, this.game.startingLives); i++) {
            livesDisplay += "❤️";
        }
        for (let i = 0; i < this.game.startingLives - this.currentLifeCount; i++) {
            livesDisplay += "🩶";
        }
        for (let i = 0; i < this.currentLifeCount - this.game.startingLives; i++) {
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
        
        this.players = [];
        this.alphabetRule = new Set();
        this.wordDictionary = new Set();
        this.substrings = new Map();

        if (baseTimerDuration <= MAX_BASE_TIMER_DURATION && baseTimerDuration >= MIN_BASE_TIMER_DURATION) {
            this.baseTimerDuration = baseTimerDuration; // could add variation depending on substring rarity
        } else {
            throw new Error(`Bomb timer duration must be between ${MIN_BASE_TIMER_DURATION} and ${MAX_BASE_TIMER_DURATION} inclusive`);
        }
        if (maxPlayers <= MAX_MAX_PLAYERS_PER_ROOM && maxPlayers >= MIN_MAX_PLAYERS_PER_ROOM) {
            this.maxPlayers = maxPlayers; 
        } else {
            throw new Error(`Max players must be between ${MIN_MAX_PLAYERS_PER_ROOM} and ${MAX_MAX_PLAYERS_PER_ROOM} inclusive`);
        }
        if (startingLives <= MAX_STARTING_LIVES && startingLives >= MIN_STARTING_LIVES) {
            this.startingLives = startingLives; 
        } else {
            throw new Error(`Starting lives must be between ${MIN_STARTING_LIVES} and ${MAX_STARTING_LIVES} inclusive`);
        }

        this.currentRound = 1;
        this.currentSubstring = "ION";
        this.wordsSubmitted = new Map();

        this.isActive = false;

        this.leader = null; // should just be the first player in the this.players array

        this.gameCreationTime = (new Date()).getTime();
    }

    addPlayer(player) {
        if (this.players.length >= this.maxPlayers) {
            throw new GameError("This room is full!");
        }

        this.players.push(player);

        if (this.leader === null) {
            this.leader = player;
        }
    }

    startGame() {
        if (this.players.length === 0) {
            throw new GameError("There are no players in this room!");
            
        } else if (this.players.length > this.maxPlayers) {
            throw new GameError("There are too many players in this room!");
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
    // contains all the games as a map with key room code

    constructor() {
        this.games = new Map();
    }

    addGame(roomCode,
            maxPlayers = DEFAULT_MAX_PLAYERS_PER_ROOM,
            baseTimerDuration = DEFAULT_BASE_TIMER_DURATION,
            startingLives = DEFAULT_STARTING_LIVES) {
        let newGame = new Game(roomCode, maxPlayers = maxPlayers, baseTimerDuration = baseTimerDuration, startingLives);
        this.games.set(roomCode, newGame);

        return newGame;
    }

    numGames() {
        return this.games.size;
    }

    numActiveGames() {
        // should return the number of games in session
    }
}