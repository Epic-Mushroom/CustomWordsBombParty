import * as client_main from "./client_main.js";

function submit_guess() {
    console.log("the submit guess button was clicked");

    client_main.socket.emit("submit_guess");
}

// socket.io listeners
client_main.socket.on("alert", (message) => {
    alert(message);
});

// get elements (game page)
const roomCodeContainer = document.getElementById("room_code_container");
const submitButton = document.getElementById("submit_button");

// element listeners
submitButton?.addEventListener("click", submit_guess);