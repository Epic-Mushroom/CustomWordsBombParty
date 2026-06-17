import * as gameLogic from "./game.js";

function set_username(username) {
    console.log(`trying to store username "${username}"`)

    localStorage.setItem("username", username);
}

function pre_fill_room_rule_defaults() {
    console.log(`trying to pre-fill room rule defaults`)

    maxPlayersField.value = gameLogic.DEFAULT_MAX_PLAYERS_PER_ROOM;
    baseTimerDurationField.value = gameLogic.DEFAULT_BASE_TIMER_DURATION;
    startingLivesField.value = gameLogic.DEFAULT_STARTING_LIVES;
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

// establishes connection
const socket = io();

// socket.io listeners
socket.on("fetch_rooms_list", (roomCodesList) => {
    for (const roomCode of roomCodesList) {
        add_room_to_room_code_list(roomCode);
    }
})
socket.on("update_rooms_list", add_room_to_room_code_list);
socket.on("pre_fill_room_rule_defaults", pre_fill_room_rule_defaults);

// get elements
const root = document.documentElement;

const usernameButton = document.getElementById("submit_username_button");
const usernameField = document.getElementById("username_field");

const maxPlayersField = document.getElementById("max_players_field");
const baseTimerDurationField = document.getElementById("base_timer_duration_field");
const startingLivesField = document.getElementById("starting_lives_field");
const createRoomButton = document.getElementById("create_room_button");
const defaultRulesButton = document.getElementById("reset_rules_button");

const roomsList = document.getElementById("active_rooms_list");

const submitButton = document.getElementById("submit_button");

// element listeners
usernameButton.addEventListener("click", () => {
    set_username(usernameField.value);
});
createRoomButton?.addEventListener("click", create_room);
defaultRulesButton?.addEventListener("click", pre_fill_room_rule_defaults);
submitButton?.addEventListener("click", submit_guess);

// other listeners
// sets the gradient midpoint to mouse cursor location
window.addEventListener("mousemove", (event) => {
    let xPercent = (event.clientX / window.innerWidth) * 100;
    let yPercent = (event.clientY / window.innerHeight) * 100;

    root.style.setProperty("--gradient-midpoint", `${xPercent}%`);
})

// pre-fill username text field
if (localStorage.getItem("username") != null) {
    console.log(`trying to pre-fill username field with username "${localStorage.getItem("username")}"`)

    usernameField.value = localStorage.getItem("username");
}

// pre-fill defaults for room rules
