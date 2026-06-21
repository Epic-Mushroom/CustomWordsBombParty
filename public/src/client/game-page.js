import * as clientMain from "./client-main.js";

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

function submitGuess() {
    console.log("the submit guess button was clicked");

    clientMain.socket.emit("submit_guess");
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
const playerInfoContainer = document.getElementById("player-info");
const submitButton = document.getElementById("submit-button");

// element listeners
usernameButton?.addEventListener("click", () => {
    clientMain.setUsername(usernameField, usernameField.value);
});
submitButton?.addEventListener("click", submitGuess);

// socket.io listeners
clientMain.socket.on("force_username_update", (newUsername) => clientMain.setUsername(usernameField, newUsername));
clientMain.socket.on("update_player_info", (playerStrings, playerUsernames) => updatePlayerInfo(playerInfoContainer, playerStrings, playerUsernames));
clientMain.socket.on("connect", async () => {
    const response = await clientMain.socket.timeout(10000).emitWithAck("validate_room_code", getRoomCode());

    if (response.validRoom) {
        console.log("valid code");

        await clientMain.socket.emitWithAck("join_io_room", getRoomCode());

        clientMain.displayRoomCodeInfo(roomCodeContainer, getRoomCode());
        clientMain.socket.emit("add_player_to_room", localStorage.getItem("username"), getRoomCode());

    } else {
        console.log("invalid code");

        mainGameContainer.replaceChildren();
        let invalidCodeInfoText = document.createElement("h3");
        invalidCodeInfoText.textContent = "This room doesn't exist!";

        mainGameContainer.append(invalidCodeInfoText);
    }
});

clientMain.preFillUsernameField(usernameField);
