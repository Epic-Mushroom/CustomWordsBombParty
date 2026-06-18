export * as gameLogic from "../server/game.js";

export const CLIENT_TICK_DELAY = 50; // ms
export const MAX_GRADIENT_DISTANCE = 80; // percent
export const MIN_GRADIENT_DISTANCE = 20; // percent

export let targetGradientX = 50; // percent

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
