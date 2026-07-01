import {io} from "https://cdn.socket.io/4.8.3/socket.io.esm.min.js";
import {Howl} from "https://esm.sh/howler";

export const CLIENT_TICK_DELAY = 50; // ms
export const MAX_GRADIENT_DISTANCE = 80; // percent
export const MIN_GRADIENT_DISTANCE = 20; // percent

// sounds
export const correctSFX = new Howl({
    src: ["../../sounds/correct.mp3"]
});
export const incorrectSFX = new Howl({
    src: ["../../sounds/incorrect.mp3"]
});
export const bombSFX = new Howl({
    src: ["../../sounds/bomb.mp3"]
});
export const bombRareSFX = new Howl({
    src: ["../../sounds/bomb-rare.mp3"]
});
export const lockSFX = new Howl({
    src: ["../../sounds/lock.mp3"]
});
export const turnStartSFX = new Howl({
    src: ["../../sounds/turn-start.mp3"]
});

const COPY_FLAVOR_TEXT = [ // indexed based on num times previously copied
    "copied URL!",
    "copied URL again!",
    "copied a third time! share the URL with your friends!",
    "copied a fourth time! tell them to paste it into their address bar!",
    "copied a fifth time!",
    "copied a sixth time...",
    "copied a seventh time...",
    "copied eight times...",
    "copied for the ninth time...",
    "you might have copied enough",
    "you can rest assured it's copied",
    "yeah i'm pretty sure you copied it",
    "ok u can stop now",
]

export let targetGradientX = 50; // percent

let timesLinkCopied = 0;

export const root = document.documentElement;

export function resetTimesCopied() {
    timesLinkCopied = 0;
}

/**
 * 
 * @param {HTMLElement} backgroundElement 
 * @param {string} colorHexString 
 */
export function flashBackground(backgroundElement, colorHexString = "#ff0000") {
    root.style.setProperty("--flash-color", colorHexString);

    backgroundElement.classList.toggle("flash-bg", false);
    requestAnimationFrame(() => backgroundElement.classList.toggle("flash-bg", true));
}

export function flashTextInput(textInput, colorHexString = "#ff0000") {
    // can (probably will) cause conflicts if both bg and text input are flashed
    root.style.setProperty("--flash-color", colorHexString);

    textInput.classList.toggle("flash-text-input", false);
    requestAnimationFrame(() => textInput.classList.toggle("flash-text-input", true));
}

export function preFillUsernameField(usernameField, username = null) {
    if (username != null) {
        console.log(`trying to pre-fill username field with username "${username}"`)

        usernameField.value = username;

    } else if (localStorage.getItem("username") != null) {
        console.log(`trying to pre-fill username field with username "${localStorage.getItem("username")}"`)

        usernameField.value = localStorage.getItem("username");
    }
}

export async function setUsername(usernameField, username) {
    console.log(`trying to store username "${username}"`)

    if (username.trim() !== "") {
        let response = await socket.timeout(10000).emitWithAck("set_server_username", username);

        if (!response.usernameSet) {
            alert("There is already another player in this room with that name!");
            return;
        }

        usernameField.value = username.trim();
        localStorage.setItem("username", username.trim());
    }
}

export async function makeRoomCodeCopyable(roomCode, textElement) {
    try {
        await navigator.clipboard.writeText(`${window.location.hostname}:${window.location.port}/game/${roomCode}`);
        let copySuccessText = ""

        if (timesLinkCopied >= COPY_FLAVOR_TEXT.length) {
            copySuccessText = "...";

        } else {
            copySuccessText = COPY_FLAVOR_TEXT[timesLinkCopied];
        }

        textElement.textContent = `Room Code: ${roomCode} (${copySuccessText})`;
        timesLinkCopied++;

    } catch (err) {
        textElement.textContent = `Room Code: ${roomCode} (failed to copy URL)`;
    }
}

export function displayRoomCodeInfo(container, roomCode, addJoinButton = false) {
    // clear the container first
    container.replaceChildren();

    resetTimesCopied();

    let newRoomSpan = document.createElement("span");
    newRoomSpan.textContent = `Room Code: ${roomCode} (click to copy URL)`;
    newRoomSpan.classList.add("green-text");
    newRoomSpan.addEventListener("click", async () => {
        makeRoomCodeCopyable(roomCode, newRoomSpan);
    })
    container.prepend(newRoomSpan);

    console.log(`displaying newly generated room code ${roomCode}`);

    if (addJoinButton) {
        let joinRoomButton = document.createElement("button");
        joinRoomButton.textContent = "Join Room";
        joinRoomButton.type = "button";
        joinRoomButton.id = "join-room-button";
        joinRoomButton.onclick = () => {
            window.location.href = `/game/${roomCode}`;
        };

        container.append(joinRoomButton);

        console.log("added button to join room");
    }

}

// establishes connection
export const socket = io();

socket.on("alert", (message) => {
    alert(message);
});
socket.on("alert_with_redirect", (message) => {
    alert(message);
    window.location.href = "/";
});

// other listeners
// sets the gradient midpoint to mouse cursor location
export let gradientOnMouseMove = window.addEventListener("mousemove", (event) => {
    let xPercent = (event.clientX / window.innerWidth) * 100;
    // let yPercent = (event.clientY / window.innerHeight) * 100;

    targetGradientX = Math.max(Math.min(xPercent, MAX_GRADIENT_DISTANCE), MIN_GRADIENT_DISTANCE)
})

export let gradientLerp = setInterval(() => {
    const currentGradientX = parseFloat(window.getComputedStyle(root).getPropertyValue("--gradient-midpoint").replace("%", ""));

    root.style.setProperty("--gradient-midpoint", `${
        currentGradientX + 0.06 * (targetGradientX - currentGradientX)
    }%`);
    // console.log(`moving gradient from ${window.getComputedStyle(root).getPropertyValue("--gradient-midpoint")} (${currentGradientX}) to ${targetGradientX}`);
}, 0.33 * CLIENT_TICK_DELAY);

// forces complete disconnect before client is able to reconnect (in the case of refreshes);
window.addEventListener("beforeunload", () => socket.disconnect());