roomCodeCharacters = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'A', 'S', 'D', 'F', 'G', 'Z', 'Y'];

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max) + 1;
  return Math.floor(Math.random() * (max - min) + min);
}

function generateRoomCode(length) {
    roomCode = "";

    for (i = 0; i < length; i = i + 1) {
        roomCode += roomCodeCharacters[getRandomInt(0, roomCodeCharacters.length - 1)];
    }

    return roomCode;
}