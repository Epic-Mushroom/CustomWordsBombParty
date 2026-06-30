import fs from "fs";
import readline from "readline";

/**
 * 
 * @param {string} filePath 
 * @param {function} onLineCallback 
 * @param {function} onCloseCallback 
 */
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

// weightFunction is applied to every element in the iterable
// ONLY WORKS WITH ITERABLES THAT DON'T EXPIRE AFTER ONE PASS
export function getWeightedRandomElementAlt(iterable, weightFunction) {
  // first find sum of weights
  let weightsSum = 0;
  for (const element of iterable) {
    let curWeight = weightFunction(element);

    if (curWeight < 0) {
      throw new Error("Weight of an element cannot be negative");

    } else {
      weightsSum += curWeight;

    }
  }

  if (weightsSum <= 0) {
    throw new Error("Sum of weights cannot be zero or negative");
  }

  let targetWeightThreshold = Math.random() * weightsSum;
  let cumulativeWeightsSum = 0;
  for (const element of iterable) {
    cumulativeWeightsSum += weightFunction(element);
    if (cumulativeWeightsSum > targetWeightThreshold) {
      return element;
    }
  }

  return null; // just in case
}

export function getWeightedRandomElement(iterable, weightFunction) {
  let cumulativeWeightsSum = 0;
  let selectedElement = null;
  for (const element of iterable) {
    let curWeight = weightFunction(element);
    cumulativeWeightsSum += curWeight;

    if (curWeight < 0) {
      throw new Error("Weight of an element cannot be negative");

    } else if (cumulativeWeightsSum > 0 && Math.random() < (1.0 * curWeight) / cumulativeWeightsSum) {
      selectedElement = element;

    }
  }

  if (cumulativeWeightsSum <= 0) {
    throw new Error("Sum of weights cannot be zero or negative");
  }

  return selectedElement;
}

/**
 * 
 * @param {string} input 
 * @returns {Array<string>}
 */
export function parseCommaOrLineBreakSeparatedValues(input) {
  if (input === "") {
    return [];
  }

  return input.split(/[,\r\n]+/);
}