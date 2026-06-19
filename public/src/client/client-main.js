export * as gameLogic from "../server/game.js";

export const CLIENT_TICK_DELAY = 50; // ms
export const MAX_GRADIENT_DISTANCE = 80; // percent
export const MIN_GRADIENT_DISTANCE = 20; // percent

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
window.timesLinkCopied = () => {return timesLinkCopied};

const root = document.documentElement;

export function resetTimesCopied() {
    timesLinkCopied = 0;
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

// other listeners
// sets the gradient midpoint to mouse cursor location
export let gradientOnMouseMove = window.addEventListener("mousemove", (event) => {
    let xPercent = (event.clientX / window.innerWidth) * 100;
    let yPercent = (event.clientY / window.innerHeight) * 100;

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