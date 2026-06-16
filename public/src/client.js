function submit() {
    console.log("a button was clicked");

    socket.emit("submit_guess");
}

function create_room() {
    console.log("trying to create room");

    socket.emit("generate_room_code");
}

const socket = io();

const submitButton = document.getElementById("submit_button");
submitButton.addEventListener("click", submit);

const createRoomButton = document.getElementById("create_room_button");
createRoomButton.addEventListener("click", create_room);