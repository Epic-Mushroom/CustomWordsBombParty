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
function gameplayVisibility(gameplayContainer, isClientTurn, curTurnHolderUsername) {
    clientMain.root.style.setProperty("--gameplay-visibility", "flex");

    if (isClientTurn) {
        clientMain.root.style.setProperty("--guess-entry-visibility", "block");
        clientMain.root.style.setProperty("--waiting-visibility", "none");
        console.log("showing submit guess interface");

    } else {
        let waitingSpan = document.getElementById("waiting-for-player");
        waitingSpan.textContent = `Waiting for ${curTurnHolderUsername}`;

        clientMain.root.style.setProperty("--guess-entry-visibility", "none");
        clientMain.root.style.setProperty("--waiting-visibility", "block");
        console.log("hiding submit guess interface");

    }
}

/**
 * 
 * @param {string} winnerUsername 
 */
function showWinner(winnerUsername) {
    clientMain.root.style.setProperty("--winner-visibility", "block");
    clientMain.root.style.setProperty("--guess-entry-visibility", "none");
    clientMain.root.style.setProperty("--waiting-visibility", "none");
    clientMain.root.style.setProperty("--substring-visibility", "none");

    let winnerSpan = document.getElementById("winner");
    winnerSpan.textContent = `🎉 ${winnerUsername} has won the game!`;
}

function submitGuess() {
    console.log("the submit guess button was clicked");

    socket.emit("submit_guess");
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
const submitButton = document.getElementById("submit-button");
const playerInfoContainer = document.getElementById("player-info");

// element listeners
usernameButton?.addEventListener("click", () => {
    clientMain.setUsername(usernameField, usernameField.value);
});
startGameButton.addEventListener("click", startGame);
submitButton?.addEventListener("click", submitGuess);

// socket.io listeners
socket.on("force_username_update", (newUsername) => clientMain.setUsername(usernameField, newUsername));
socket.on("update_player_info", (playerStrings, playerUsernames) => updatePlayerInfo(playerInfoContainer, playerStrings, playerUsernames));
socket.on("show_start_game_container", (isLeader) => showStartGameContainer(startGameContainer, isLeader));
socket.on("gameplay_visibility", (isClientTurn, curTurnHolderUsername) => {
    gameplayVisibility(gameplayContainer, isClientTurn, curTurnHolderUsername);
})
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
