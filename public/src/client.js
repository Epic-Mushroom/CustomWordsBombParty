function submit() {
    console.log("a button was clicked");

    socket.emit("submit_guess");
}

function create_room() {
    console.log("trying to create room");

    socket.emit("create_room");
}

const socket = io();

const submitButton = document.getElementById("submit_button");
const createRoomButton = document.getElementById("create_room_button");
const roomsList = document.getElementById("active_rooms_list");

submitButton.addEventListener("click", submit);
createRoomButton.addEventListener("click", create_room);

socket.on("update_rooms_list", (generated_code) => {
    let new_room_li = document.createElement("li");
    new_room_li.textContent = generated_code;
    roomsList.appendChild(new_room_li);

    console.log("added room to room code list");
});