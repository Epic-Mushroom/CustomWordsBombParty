class Player {
    // has a username, a game that it is connected to, number of lives,
    // current timer value, alphabet matched to the game's alphabet rule (make sure not to update after getting extra life)

    constructor(username) {

    }
}

class Game {
    // has an array of players, set that is the dictionary of words,
    // dictionary of substrings mapped to count, dictionary of words already done (key: word, value: player), 
    // room code, alphabet rule (set of letters) for generating extra lives
    // max timer length, maxPlayers, starting life count, current round number

    constructor(roomCode, maxTimerLength, maxPlayers, startingLives) {
        this.roomCode = roomCode;
        
        this.players = [];
        this.alphabetRule = new Set();
        this.wordDictionary = new Set();
        this.substrings = {};

        this.maxTimerLength = maxTimerLength;
        this.maxPlayers = maxPlayers;
        this.startingLives = startingLives;

        this.currentRound = 1;
        this.wordsSubmitted = {};
    }
}