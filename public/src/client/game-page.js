import * as clientMain from "./client-main.js";

let isValidRoomCode = false;

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
const submitButton = document.getElementById("submit-button");

// element listeners
submitButton?.addEventListener("click", submitGuess);

// socket.io listeners
clientMain.socket.on("alert", (message) => {
    alert(message);
});
clientMain.socket.on("connect", async () => {
    const response = await clientMain.socket.timeout(10000).emitWithAck("validate_room_code", getRoomCode());

    if (response.validRoom) {
        console.log("valid code");

        // do stuff

    } else {
        console.log("invalid code");

        mainGameContainer.replaceChildren();
        let invalidCodeInfoText = document.createElement("h3");
        invalidCodeInfoText.textContent = "This room doesn't exist!";

        mainGameContainer.append(invalidCodeInfoText);
    }
})