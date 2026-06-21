import fs from "fs";
import readline from "readline";

export function readFile(filePath, onLineCallback, onCloseCallback = () => {}) {
  const fileStream = fs.createReadStream(filePath);
  const readlineInterface = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  readlineInterface.on("line", (line) => onLineCallback(line));
  readlineInterface.on("close", onCloseCallback);
}

export function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max) + 1;
  return Math.floor(Math.random() * (max - min) + min);
}