import * as clientMain from "./client-main.js";
import {socket} from "./client-main.js";

function updatePlayerInfo(playerInfoContainer, playerStrings, playerUsernames) {
    // console.log("trying to update player info");

    playerInfoContainer.replaceChildren();

    for (let i = 0; i < playerStrings.length; i++) {
        let playerString = playerStrings[i];

        let newPlayerLi = document.createElement("li");
        if (playerUsernames[i] === localStorage.getItem("username")) {
            let boldElement = document.createElement("b");
            boldElement.textContent = playerString;
            newPlayerLi.append(boldElement);
        } else {
            newPlayerLi.textContent = playerString;
        }
        playerInfoContainer.append(newPlayerLi);

        // console.log(`adding ${playerString} to player info`)
    }
}

function showStartGameContainer(startGameContainer, isGameLeader = false) {
    if (isGameLeader) {
        clientMain.root.style.setProperty("--start-game-button-visibility", "block");
    } else {
        clientMain.root.style.setProperty("--start-game-button-visibility", "none");
    }
}

function hideStartGameContainer(startGameContainer) {
    clientMain.root.style.setProperty("--start-game-button-visibility", "none");
}

async function startGame() {
    let response = await socket.timeout(10000).emitWithAck("start_game");

    if (!response.started) {
        alert(response.message);

    } else {
        hideStartGameContainer();
    }
}

/**
 * 
 * @param {HTMLElement} gameplayContainer 
 * @param {boolean} isClientTurn 
 */
function gameplayVisibility(submitGuessTextBox, substringElement, isClientTurn, curTurnHolderUsername, curSubstring, endTime) {
    clientMain.root.style.setProperty("--gameplay-visibility", "flex");

    promptInfoVisibility(substringElement, timeLeftElement, curSubstring, endTime);

    if (isClientTurn) {
        clientMain.root.style.setProperty("--guess-entry-visibility", "block");
        clientMain.root.style.setProperty("--waiting-visibility", "none");

        submitGuessTextBox.value = "";
        submitGuessTextBox.focus();

        console.log("showing submit guess interface");

    } else {
        let waitingSpan = document.getElementById("waiting-for-player");
        waitingSpan.textContent = `Waiting for ${curTurnHolderUsername}`;

        clientMain.root.style.setProperty("--guess-entry-visibility", "none");
        clientMain.root.style.setProperty("--waiting-visibility", "block");
        console.log("hiding submit guess interface");

    }
}

function promptInfoVisibility(substringElement, timeLeftElement, curSubstring, endTime) {
    substringElement.textContent = `"${curSubstring.toUpperCase()}"`;

    let endTimeSeconds = endTime / 1000.0;
    updateTimeLeft(timeLeftElement, endTimeSeconds);
}

/**
 * 
 * @param {HTMLElement} timeLeftElement 
 * @param {number} endTimeSeconds 
 * @returns 
 */
function updateTimeLeft(timeLeftElement, endTimeSeconds) {
    clearInterval(bombTimerInterval);
    timeLeftElement.textContent = Math.max(endTimeSeconds - Date.now() / 1000.0, 0).toFixed(1);

    bombTimerInterval = setInterval(() => {
        timeLeftElement.textContent = Math.max(endTimeSeconds - Date.now() / 1000.0, 0).toFixed(1);
        if (endTimeSeconds - (Date.now() / 1000.0) <= 0) {
            clearInterval(bombTimerInterval);
        }
    }, 100);
}

/**
 * 
 * @param {string} winnerUsername 
 */
function showWinner(winnerUsername) {
    clientMain.root.style.setProperty("--winner-visibility", "block");
    clientMain.root.style.setProperty("--guess-entry-visibility", "none");
    clientMain.root.style.setProperty("--waiting-visibility", "none");
    clientMain.root.style.setProperty("--prompt-info-visibility", "none");

    let winnerSpan = document.getElementById("winner");
    winnerSpan.textContent = `🎉 ${winnerUsername} has won the game!`;
}

/**
 * 
 * @param {string} guess 
 */
async function submitGuess(guess) {
    console.log(`client tried to submit guess ${guess}`);

    let response = await socket.timeout(10000).emitWithAck("submit_guess", guess);

    if (response.failure) {
        // flash red

        submitGuessTextBox.value = "";
        console.log(`invalid guess`);

    } else {
        // flash green
        console.log(`valid guess`);
    }
}

function getRoomCode() {
    let pathname = window.location.pathname;
    return pathname.slice(pathname.lastIndexOf("/game/") + "/game/".length).replace("/", "");
}

// get elements (game page)
const usernameButton = document.getElementById("submit-username-button");
const usernameField = document.getElementById("username-field");

const roomCodeContainer = document.getElementById("room-code-container");
const mainGameContainer = document.getElementById("main-game");
const startGameContainer = document.getElementById("start-game");
const startGameButton = document.getElementById("start-game-button");
const gameplayContainer = document.getElementById("gameplay");
const substringElement = document.getElementById("substring");
const timeLeftElement = document.getElementById("time-left");
const submitGuessTextBox = document.getElementById("guess")
const submitGuessForm = document.getElementById("submit-guess-form");
const playerInfoContainer = document.getElementById("player-info");

// intervals
let bombTimerInterval = null;

// element listeners
usernameButton?.addEventListener("click", () => {
    clientMain.setUsername(usernameField, usernameField.value);
});
startGameButton.addEventListener("click", startGame);
submitGuessForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitGuess(submitGuessTextBox.value);
})

// socket.io listeners
socket.on("force_username_update", (newUsername) => clientMain.setUsername(usernameField, newUsername));
socket.on("update_player_info", (playerStrings, playerUsernames) => updatePlayerInfo(playerInfoContainer, playerStrings, playerUsernames));
socket.on("show_start_game_container", (isLeader) => showStartGameContainer(startGameContainer, isLeader));
socket.on("gameplay_visibility", (isClientTurn, curTurnHolderUsername, curSubstring, endTime) => {
    gameplayVisibility(submitGuessTextBox, substringElement, isClientTurn, curTurnHolderUsername, curSubstring, endTime);
});
socket.on("show_winner", showWinner);
socket.on("connect", async () => {
    const response = await socket.timeout(10000).emitWithAck("validate_room_code", getRoomCode());

    if (response.validRoom) {
        console.log("valid code");

        await socket.emitWithAck("join_io_room", getRoomCode());

        clientMain.displayRoomCodeInfo(roomCodeContainer, getRoomCode());
        socket.emit("add_player_to_room", localStorage.getItem("username"), getRoomCode());

    } else {
        console.log("invalid code");

        mainGameContainer.replaceChildren();
        let invalidCodeInfoText = document.createElement("h3");
        invalidCodeInfoText.textContent = "This room doesn't exist!";

        mainGameContainer.append(invalidCodeInfoText);
    }
});

clientMain.preFillUsernameField(usernameField);
