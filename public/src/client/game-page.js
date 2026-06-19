import * as clientMain from "./client-main.js";

let isValidRoomCode = false;

function updatePlayerInfo(playerInfoContainer, playerStrings) {
    // console.log("trying to update player info");

    playerInfoContainer.replaceChildren();

    for (const playerString of playerStrings) {
        let newPlayerLi = document.createElement("li");
        newPlayerLi.textContent = playerString;
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
const roomCodeContainer = document.getElementById("room-code-container");
const mainGameContainer = document.getElementById("main-game");
const playerInfoContainer = document.getElementById("player-info");
const submitButton = document.getElementById("submit-button");

// element listeners
submitButton?.addEventListener("click", submitGuess);

// socket.io listeners
clientMain.socket.on("alert", (message) => alert(message));
clientMain.socket.on("alert_with_redirect", (message) => {
    alert(message);
    console.log("alert_with_redirect");
    window.location.href = "/";
});
clientMain.socket.on("update_player_info", (playerStrings) => updatePlayerInfo(playerInfoContainer, playerStrings));
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
})
