// Build encoder and decoder for Bencoding format
// Handle 4 types: strings (length-prefixed), integers (i42e), lists, dictionaries
// Use TDD approach - write tests for each type
// Keys in dictionaries must be in lexicographical order

export const decode = (encodedString: string, start: number) => {
  console.log(">Decoding: ", encodedString);

  if (encodedString[start] === "i") {
    return decodeNumber(encodedString, start);
  } else if (encodedString[start] === "l") {
    return decodeList(encodedString, start);
  } else if (encodedString[start] === "d") {
    return decodeDictionary(encodedString, start);
  } else {
    return decodeString(encodedString, start);
  }
};

const decodeDictionary = (encodedString: string, start: number) => {

  console.log("Decoding: ", encodedString, "index: ", start);

  let object: any = {};
  let currentPosition = start + 1;

  while (currentPosition < encodedString.length) {
    if (encodedString[currentPosition] === "e") {
      return { decodedValue: object, index: currentPosition };
    }

    // Decode key
    let keyResult = decodeString(encodedString, currentPosition);
    if (keyResult) {
      currentPosition = keyResult.index;
    }

    // Decode value
    let valueResult = decode(encodedString, currentPosition);
    if (valueResult) {
      currentPosition = valueResult.index;
    }

    if (keyResult && valueResult) {
      object[keyResult.decodedValue] = valueResult?.decodedValue;
    }

    return { decodedValue: object, index: currentPosition };
  }
};

const decodeList = (encodedString: string, start: number) => {
  // loop through and if string pass to decodeString, if number pass to decodeNumber
  // l6:Coding10:Challenges4:cake5:happye
  let array = [];
  let currentPosition = start;

  while (currentPosition < encodedString.length) {
    if (encodedString[currentPosition] === "l") {
      currentPosition++;
    }

    if (encodedString[currentPosition] === "e") {
      return { decodedValue: array, index: currentPosition };
    }

    let result;
    if (encodedString[currentPosition] === "i") {
      result = decodeNumber(encodedString, currentPosition);
    } else {
      result = decodeString(encodedString, currentPosition);
    }

    if (result) {
      array.push(result.decodedValue);
      currentPosition = result.index;
    }
  }
};

const decodeString = (encodedString: string, start: number) => {
  let decodedValue;
  let index = start;
  let wordStartIndex = 0;
  let currentWordLength = 0;

  for (let i = start; i < encodedString.length; i++) {
    // if colon keep everything from start to colon position, thats the number
    if (encodedString[i] === ":") {
      wordStartIndex = i + 1;
      const currentLength = encodedString.slice(start, i);
      currentWordLength = Number(currentLength);
      decodedValue = encodedString.slice(
        wordStartIndex,
        i + currentWordLength + 1
      );

      index = i + currentWordLength + 1;

      console.log(decodedValue);
      return { decodedValue, index };
    }
  }
};

const decodeNumber = (encodedString: string, start: number) => {
  let decodedValue;
  let numEnd = 0;

  for (let i = start; i < encodedString.length; i++) {
    if (encodedString[i] === "e") {
      numEnd = i;
      decodedValue = Number(encodedString.slice(start + 1, numEnd));
      return { decodedValue, index: numEnd + 1 };
    }
  }
};

export const encode = () => {};
