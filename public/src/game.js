DEFAULT_MAX_TIMER_LENGTH = 8; // seconds
DEFAULT_MAX_PLAYERS_PER_ROOM = 10;
DEFAULT_STARTING_LIVES = 3;

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
    // max timer length, maxPlayers, starting life count, current round number, current player turn

    constructor(roomCode, maxTimerLength = DEFAULT_MAX_TIMER_LENGTH,
                maxPlayers = DEFAULT_MAX_PLAYERS_PER_ROOM,
                startingLives = DEFAULT_STARTING_LIVES) {
        this.roomCode = roomCode;
        
        this.players = [];
        this.alphabetRule = new Set();
        this.wordDictionary = new Set();
        this.substrings = new Map();

        this.maxTimerLength = maxTimerLength; // could add variation depending on substring rarity
        this.maxPlayers = maxPlayers;
        this.startingLives = startingLives;

        this.currentRound = 1;
        this.wordsSubmitted = new Map();
    }

    nextTurn() {

    }

    nextRound() {

    }
}

class GameManager {
    // contains all the games as a map with key room code

    constructor() {
        this.games = new Map();
    }

    addGame(roomCode, maxTimerLength = DEFAULT_MAX_TIMER_LENGTH,
            maxPlayers = DEFAULT_MAX_PLAYERS_PER_ROOM,
            startingLives = DEFAULT_STARTING_LIVES) {
        this.games.set(roomCode, new Game(roomCode, maxTimerLength, maxPlayers, startingLives));
    }
}

module.exports = {
    Player,
    Game,
    GameManager
}