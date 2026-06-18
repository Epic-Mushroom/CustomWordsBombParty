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
    } else {
        console.log("invalid code");
    }
})