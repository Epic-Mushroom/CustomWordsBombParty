function submit() {
    console.log("a button was clicked");

    socket.emit("submit_guess");
}

const socket = io();

const submitButton = document.getElementById("submit_button");
submitButton.addEventListener("click", submit);