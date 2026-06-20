
import {getRandomInt} from "../utils.js";

const ROOM_CODE_CHARACTERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'A', 'S', 'P', 'F', 'G', 'L', 'H', 'X', 'Y'];
const DEFAULT_ROOM_CODE_LENGTH = 4;

export function generateRoomCode(length = DEFAULT_ROOM_CODE_LENGTH) {
    let roomCode = "";

    for (let i = 0; i < length; i = i + 1) {
        roomCode += ROOM_CODE_CHARACTERS[getRandomInt(0, ROOM_CODE_CHARACTERS.length - 1)];
    }

    return roomCode;
}