import * as clientMain from "./client-main.js";

function submitGuess() {
    console.log("the submit guess button was clicked");

    clientMain.socket.emit("submit_guess");
}

function isValidRoom(roomCodesList) {
    let pathname = window.location.pathname;
    let roomCode = pathname.slice(pathname.lastIndexOf("/game/") + "/game/".length).replace("/", "");

    return roomCodesList.includes(roomCode);
}

// socket.io listeners
clientMain.socket.on("alert", (message) => {
    alert(message);
});

// get elements (game page)
const roomCodeContainer = document.getElementById("room-code-container");
const submitButton = document.getElementById("submit-button");

// element listeners
submitButton?.addEventListener("click", submitGuess);