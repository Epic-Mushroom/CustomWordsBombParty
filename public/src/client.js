function set_username(username) {
    console.log(`trying to store username "${username}"`)

    localStorage.setItem("username", username);
}

function create_room() {
    console.log("trying to create room");

    socket.emit("create_room");
}

function add_room_to_room_code_list(roomCode) {
    let new_room_li = document.createElement("li");
    new_room_li.textContent = roomCode;
    roomsList.appendChild(new_room_li);

    console.log("added room to room code list");
}

function submit_guess() {
    console.log("the submit guess button was clicked");

    socket.emit("submit_guess");
}

const socket = io();

// socket.io listeners
socket.on("fetch_rooms_list", (roomCodesList) => {
    for (const roomCode of roomCodesList) {
        add_room_to_room_code_list(roomCode);
    }
})

socket.on("update_rooms_list", add_room_to_room_code_list);

// buttons
const usernameButton = document.getElementById("submit_username_button");
const submitButton = document.getElementById("submit_button");
const createRoomButton = document.getElementById("create_room_button");

// other elements
const usernameField = document.getElementById("username_field");
const roomsList = document.getElementById("active_rooms_list");

submitButton?.addEventListener("click", submit_guess);
createRoomButton?.addEventListener("click", create_room);
usernameButton.addEventListener("click", () => {
    set_username(usernameField.value);
});

if (localStorage.getItem("username") != null) {
    console.log(`trying to pre-fill username field with username "${localStorage.getItem("username")}"`)

    usernameField.value = localStorage.getItem("username");
}
