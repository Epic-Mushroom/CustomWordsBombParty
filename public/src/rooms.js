const ROOM_CODE_CHARACTERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'A', 'S', 'P', 'F', 'G', 'X', 'Y'];
const DEFAULT_ROOM_CODE_LENGTH = 4;

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max) + 1;
  return Math.floor(Math.random() * (max - min) + min);
}

function generateRoomCode(length = DEFAULT_ROOM_CODE_LENGTH) {
    let roomCode = "";

    for (i = 0; i < length; i = i + 1) {
        roomCode += ROOM_CODE_CHARACTERS[getRandomInt(0, ROOM_CODE_CHARACTERS.length - 1)];
    }

    return roomCode;
}

export {
    generateRoomCode
}