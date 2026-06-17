export const DEFAULT_BASE_TIMER_DURATION = 8; // seconds
export const DEFAULT_MAX_PLAYERS_PER_ROOM = 10;
export const DEFAULT_STARTING_LIVES = 3;

export const MAX_BASE_TIMER_DURATION = 67;
export const MAX_MAX_PLAYERS_PER_ROOM = 67;
export const MAX_STARTING_LIVES = 10;

export const MIN_BASE_TIMER_DURATION = 1;
export const MIN_MAX_PLAYERS_PER_ROOM = 1;
export const MIN_STARTING_LIVES = 1;

class Player {
    // has a username, a game that it is connected to, number of lives,
    // current timer value, alphabet matched to the game's alphabet rule (make sure not to update after getting extra life),
    // if it's the player's turn, if the player is alive

    constructor(username, game /* Game */) {
        this.username = username;
        this.game = game;

        this.isPlayerTurn = false;
        this.isPlayerAlive = true;
        this.currentLifeCount = game.startingLives;
        this.currentTimerValue = game.maxTimerLength; // could add variation depending on substring rarity
        this.currentAlphabet = new Set();
    }

    updateAlphabet(guess /* String */) {
        // called when submitting a correct guess, if alphabet is filled out then we add an extra life
    }
}

class Game {
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
        this.wordsSubmitted = new Map();

        this.isActive = false;
    }

    startGame() {

    }

    nextTurn() {

    }

    nextRound() {

    }

    toString() {
        return `Code: ${this.roomCode}, Maximum Players: ${this.maxPlayers}, Base Timer Duration: ${this.baseTimerDuration}, 
Starting Lives: ${this.startingLives}`;
    }
}

class GameManager {
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
}

export {
    Player,
    Game,
    GameManager
}