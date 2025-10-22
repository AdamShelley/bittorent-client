// Build encoder and decoder for Bencoding format
// Handle 4 types: strings (length-prefixed), integers (i42e), lists, dictionaries
// Use TDD approach - write tests for each type
// Keys in dictionaries must be in lexicographical order

export const decode = (encodedString: string) => {
  // If a string

  // if integer
  if (encodedString.startsWith("i") && encodedString.endsWith("e")) {
    const numberAsString = encodedString.slice(1, encodedString.length - 1);
    return Number(numberAsString);
  }
  // If list
  if (encodedString.startsWith("l") && encodedString.endsWith("e")) {
  }
  // If dictionary
  if (encodedString.startsWith("d") && encodedString.endsWith("e")) {
  }
};

export const encode = () => {};
