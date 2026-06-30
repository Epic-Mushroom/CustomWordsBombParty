import * as clientMain from "./client-main.js";
import {socket} from "./client-main.js";

function updatePlayerInfo(playerInfoContainer, playerData) {
    // console.log("trying to update player info");

    playerInfoContainer.replaceChildren();

    for (let i = 0; i < playerData.length; i++) {
        let playerString = playerData[i].asString;

        playerString += ` ${playerData[i].numCorrectGuesses} ✅ | ${playerData[i].numIncorrectGuesses} ❌ | ${playerData[i].numMisses} 💣`;

        let textElement = document.createElement("li");
        if (playerData[i].curTurnHolderUsername === playerData[i].username) {
            textElement.classList.add("bolded");
        }

        let newSpan = document.createElement("span");
        newSpan.textContent = playerString;
        textElement.append(newSpan);

        let mostRecentSubmission = (playerData[i].mostRecentGuess === "") ? "" : ` | ${playerData[i].mostRecentGuess} `;
        // if there is a most recent guess, switch over statuses
        if (mostRecentSubmission !== "") {
            switch (playerData[i].mostRecentGuessStatus) {
                case "CORRECT":
                    mostRecentSubmission += "✅";
                    break;
                case "INCORRECT":
                    mostRecentSubmission += "❌";
                    break;
                case "BOMB":
                    mostRecentSubmission += "💣";
                    break;
                case "LOCKED":
                    if (Math.random() * 50 <= 1) {
                        mostRecentSubmission += "🔏";
                    } else {
                        mostRecentSubmission += "🔒";
                    }
                    break;
                case "NONE":
                default:
                    break;
            }
        }

        // underlines the substring in the player's most recent submission
        const substringIndex = mostRecentSubmission.indexOf(playerData[i].mostRecentSubstring);
        const substringLen = playerData[i].mostRecentSubstring.length;
        if (substringIndex != -1) {
            let part1 = document.createTextNode(mostRecentSubmission.substring(0, substringIndex));
            let part2 = document.createElement("span");
            part2.textContent = playerData[i].mostRecentSubstring;
            part2.classList.add("underlined");
            let part3 = document.createTextNode(mostRecentSubmission.substring(substringIndex + substringLen, mostRecentSubmission.length));
            textElement.append(part1, part2, part3);

        } else {
            textElement.append(document.createTextNode(mostRecentSubmission));
        }

        playerInfoContainer.append(textElement);

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
 * @param {HTMLInputElement} submitGuessTextBox 
 * @param {HTMLElement} substringElement 
 * @param {boolean} isClientTurn 
 * @param {string} curTurnHolderUsername 
 * @param {string} curSubstring 
 * @param {number} endTime 
 * @param {Array<string>} playerAlphabetArray 
 * @param {Array<string>} gameAlphabetArray 
 */
function gameplayVisibility(
    submitGuessTextBox, substringElement, isClientTurn, curTurnHolderUsername, curSubstring, endTime,
    showTimeDisplay, playerAlphabetArray, gameAlphabetArray
) {
    clientMain.root.style.setProperty("--gameplay-visibility", "flex");

    promptInfoVisibility(substringElement, timeLeftContainer, timeLeftElement, curSubstring, endTime, showTimeDisplay);
    bonusAlphabetVisibility(bonusAlphabetContainer, gameAlphabetArray, playerAlphabetArray);

    if (isClientTurn) {
        let waitingSpan = document.getElementById("waiting-for-player");
        waitingSpan.textContent = `Your turn!`;

        clientMain.root.style.setProperty("--guess-entry-visibility", "block");
        clientMain.root.style.setProperty("--waiting-visibility", "block");

        submitGuessTextBox.value = "";
        submitGuessTextBox.disabled = false;
        submitGuessTextBox.focus();

        console.log("showing submit guess interface");

    } else {
        let waitingSpan = document.getElementById("waiting-for-player");
        waitingSpan.textContent = `${curTurnHolderUsername} is up...`;

        submitGuessTextBox.value = "";
        submitGuessTextBox.disabled = true;

        clientMain.root.style.setProperty("--guess-entry-visibility", "block");
        clientMain.root.style.setProperty("--waiting-visibility", "block");

        console.log("hiding submit guess interface");

    }
}

function promptInfoVisibility(substringElement, timeLeftContainer, timeLeftElement, curSubstring, endTime, showTimeDisplay) {
    substringElement.textContent = `"${curSubstring.toUpperCase()}"`;

    let endTimeSeconds = endTime / 1000.0;
    updateTimeLeft(timeLeftContainer, timeLeftElement, endTimeSeconds, showTimeDisplay);
}

/**
 * 
 * @param {HTMLElement} timeLeftElement 
 * @param {number} endTimeSeconds 
 * @returns 
 */
function updateTimeLeft(timeLeftContainer, timeLeftElement, endTimeSeconds, showTimeDisplay) {
    clearInterval(bombTimerInterval);
    timeLeftElement.textContent = Math.max(endTimeSeconds - Date.now() / 1000.0, 0).toFixed(1);

    bombTimerInterval = setInterval(() => {
        timeLeftElement.textContent = Math.max(endTimeSeconds - Date.now() / 1000.0, 0).toFixed(1);
        if (endTimeSeconds - (Date.now() / 1000.0) <= 0) {
            clearInterval(bombTimerInterval);
        }
    }, 100);

    if (showTimeDisplay) {
        timeLeftContainer.style.setProperty("display", "block");
    } else {
        timeLeftContainer.style.setProperty("display", "none");
    }
}

/**
 * 
 * @param {HTMLElement} bonusAlphabetContainer 
 * @param {Array<string>} gameAlphabetArray 
 * @param {Array<string>} playerAlphabetArray 
 */
function bonusAlphabetVisibility(bonusAlphabetContainer, gameAlphabetArray, playerAlphabetArray) {
    // should make sure the arrays are sorted alphabetically

    if (bonusAlphabetContainer.children.length != gameAlphabetArray.length) {
        // clear container and refill
        bonusAlphabetContainer.replaceChildren();

        for (const letter of gameAlphabetArray) {
            let letterDiv = document.createElement("div");
            letterDiv.id = `letter-${letter.trim().toLowerCase()}`;
            letterDiv.classList.add("unobtained-letter");
            letterDiv.textContent = letter.trim().toUpperCase();
            bonusAlphabetContainer.append(letterDiv);
        }
    }

    let obtainedLetters = new Set();
    playerAlphabetArray.forEach((letter) => obtainedLetters.add(letter.trim().toLowerCase()));

    for (const letterDiv of bonusAlphabetContainer.children) {
        const letter = letterDiv.id.replace("letter-", "");

        if (obtainedLetters.has(letter)) {
            letterDiv.classList.toggle("unobtained-letter", false);
            letterDiv.classList.toggle("obtained-letter", true);
            letterDiv.textContent = `${letter.trim().toUpperCase()} ✅`;

        } else {
            letterDiv.classList.toggle("unobtained-letter", true);
            letterDiv.classList.toggle("obtained-letter", false);
            letterDiv.textContent = `${letter.trim().toUpperCase()} ❌`;

        }
    }
}

/**
 * 
 * @param {string} winnerUsername 
 */
function showWinner(winnerUsername, winnerCorrectGuesses) {
    clientMain.root.style.setProperty("--winner-visibility", "block");
    clientMain.root.style.setProperty("--guess-entry-visibility", "none");
    clientMain.root.style.setProperty("--waiting-visibility", "none");
    clientMain.root.style.setProperty("--prompt-info-visibility", "none");

    let winnerSpan = document.getElementById("winner");
    if (winnerUsername != null) {
        winnerSpan.textContent = `🎉 ${winnerUsername} has won the game!\n${winnerCorrectGuesses} words`;
    } else {
        winnerSpan.textContent = `‼️ Draw!\nNo more words left in the list!`;
    }
    
}

/**
 * 
 * @param {string} guess 
 */
async function submitGuess(guess) {
    console.log(`client tried to submit guess ${guess}`);

    let response = await socket.timeout(10000).emitWithAck("submit_guess", guess);

    if (response.failure) {
        submitGuessTextBox.value = "";
        console.log(`${response.reason}`);

        if (response.reason === "alreadySubmitted") {
            clientMain.lockSFX.play();
            // flash orange
            clientMain.flashTextInput(submitGuessTextBox, "#ffa500");

        } else {
            clientMain.incorrectSFX.play();
            // flash red
            clientMain.flashTextInput(submitGuessTextBox, "#ff0000");

        }
 
    } else {
        console.log(`valid guess`);

        clientMain.correctSFX.play();
        // flash green
        clientMain.flashTextInput(submitGuessTextBox, "#00ff00");
    }
}

function getRoomCode() {
    let pathname = window.location.pathname;
    return pathname.slice(pathname.lastIndexOf("/game/") + "/game/".length).replace("/", "");
}

// get elements (game page)
const usernameButton = document.getElementById("submit-username-button");
const usernameField = document.getElementById("username-field");

const gameBody = document.getElementById("game-body");
const roomCodeContainer = document.getElementById("room-code-container");
const mainGameContainer = document.getElementById("main-game");
const startGameContainer = document.getElementById("start-game");
const startGameButton = document.getElementById("start-game-button");
const gameplayContainer = document.getElementById("gameplay");
const substringElement = document.getElementById("substring");
const timeLeftContainer = document.getElementById("time-left-container");
const timeLeftElement = document.getElementById("time-left");
const submitGuessTextBox = document.getElementById("guess")
const submitGuessForm = document.getElementById("submit-guess-form");
const playerInfoContainer = document.getElementById("player-info");
const bonusAlphabetContainer = document.getElementById("bonus-alphabet-container");

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
socket.on("player_info_visibility", (playerData) => updatePlayerInfo(playerInfoContainer, playerData));
socket.on("show_start_game_container", (isLeader) => showStartGameContainer(startGameContainer, isLeader));
socket.on("gameplay_visibility", (visibilityData) => {
    gameplayVisibility(
        submitGuessTextBox, substringElement,
        visibilityData.isClientTurn, visibilityData.curTurnHolderUsername,
        visibilityData.curSubstring, visibilityData.endTime, visibilityData.showTimeDisplay,
        visibilityData.playerAlphabetArray, visibilityData.gameAlphabetArray
    );
});
socket.on("ran_out_of_time", (callback) => {
    if (Math.random() >= 0.01) {
        clientMain.bombSFX.play();
    } else {
        clientMain.bombRareSFX.play();
    }
    // flash red
    clientMain.flashTextInput(submitGuessTextBox, "#ff0000");

    callback({submissionBoxContent: `${submitGuessTextBox.value}`});
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
        invalidCodeInfoText.style.setProperty("text-align", "center");
        invalidCodeInfoText.style.setProperty("padding", "20px");

        mainGameContainer.append(invalidCodeInfoText);
    }
});

clientMain.preFillUsernameField(usernameField);
