export * as gameLogic from "../server/game.js";

export const CLIENT_TICK_DELAY = 50; // ms
export const MAX_GRADIENT_DISTANCE = 80; // percent
export const MIN_GRADIENT_DISTANCE = 20; // percent

const COPY_FLAVOR_TEXT = [ // indexed based on num times previously copied
    "copied URL!",
    "copied URL again!",
    "copied a third time!",
    "copied a fourth time!",
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

let times_link_copied = 0;

// global flags
export let onHomepage = false;
export let onGamePage = false;
window.onHomepage = () => {return onHomepage};
window.onGamePage = () => {return onGamePage};

const root = document.documentElement;

export function update_page_flags() {
    console.log("updating page flags");

    if (window.location.pathname == "/") {
        onHomepage = true;
        console.log("on homepage");
    }

    if (window.location.pathname.startsWith("/game")) {
        onGamePage = true;
        console.log("on game page");
    }
}

export async function make_room_code_copyable(roomCode, textElement) {
    try {
        await navigator.clipboard.writeText(`${window.location.hostname}:${window.location.port}/game/${roomCode}`);
        let copy_success_text = ""

        if (times_link_copied >= COPY_FLAVOR_TEXT.length) {
            copy_success_text = "...";

        } else {
            copy_success_text = COPY_FLAVOR_TEXT[times_link_copied];
        }

        textElement.textContent = `Room Code: ${roomCode} (${copy_success_text})`;
        times_link_copied++;

    } catch (err) {
        textElement.textContent = `Room Code: ${roomCode} (failed to copy URL)`;
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

update_page_flags();
