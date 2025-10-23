// Build encoder and decoder for Bencoding format
// Handle 4 types: strings (length-prefixed), integers (i42e), lists, dictionaries
// Use TDD approach - write tests for each type
// Keys in dictionaries must be in lexicographical order

// Find the delimiter (the colon) - where does the length end and the string data begin?
// Extract and convert the length - what's before the colon? How do you turn that into a number you can use?
// Use that length to extract exactly the right amount - starting right after the colon, how do you grab exactly N characters?

export const decode = (encodedString: string, start: number) => {
  let decodedValue;
  let index = start;
  //str
  let wordStartIndex = 0;
  let currentWordLength = 0;
  //num
  let numEnd = 0;

  console.log(">Decoding: ", encodedString);

  // Its a number
  if (encodedString[start] === "i") {
    for (let i = 0; i < encodedString.length; i++) {
      if (encodedString[i] === "e") {
        numEnd = i;
        decodedValue = Number(encodedString.slice(start + 1, numEnd));
        return { decodedValue, numEnd };
      }
    }
  }

  // List

  // Dictionary

  // String
  for (let i = start; i < encodedString.length; i++) {
    // Handle number with i and e

    // if colon keep everything from start to colon position, thats the number
    if (encodedString[i] === ":") {
      wordStartIndex = i + 1;
      const currentLength = encodedString.slice(start, i);
      currentWordLength = Number(currentLength);
      decodedValue = encodedString.slice(
        wordStartIndex,
        i + currentWordLength + 1
      );

      index = i + currentWordLength;

      console.log(decodedValue);
      return { decodedValue, index };
    }
  }
};

export const encode = () => {};
