export type BencodeValue =
  | string
  | number
  | BencodeValue[]
  | { [key: string]: BencodeValue };

// DECODING
export const decode = (encodedString: string | Buffer, start: number) => {
  const buffer =
    typeof encodedString === "string"
      ? Buffer.from(encodedString, "utf8")
      : encodedString;

  if (buffer[start] === "i".charCodeAt(0)) {
    return decodeNumber(buffer, start);
  } else if (buffer[start] === "l".charCodeAt(0)) {
    return decodeList(buffer, start);
  } else if (buffer[start] === "d".charCodeAt(0)) {
    return decodeDictionary(buffer, start);
  } else {
    return decodeString(buffer, start);
  }
};

const decodeDictionary = (encodedString: Buffer, start: number) => {
  let object: any = {};
  let currentPosition = start + 1;

  while (currentPosition < encodedString.length) {
    if (encodedString[currentPosition] === "e".charCodeAt(0)) {
      return { decodedValue: object, index: currentPosition + 1 };
    }

    // Decode key
    let keyResult = decodeString(encodedString, currentPosition);
    if (!keyResult) throw new Error("Failed to decode dictionary key");
    currentPosition = keyResult.index;

    const key = keyResult.decodedValue.toString("utf8");

    const valueStartPosition = currentPosition;

    // Decode value
    let valueResult = decode(encodedString, currentPosition);

    if (!valueResult) throw new Error("Failed to decode dictionary value");
    currentPosition = valueResult.index;

    if (key === "info") {
      object._rawInfo = encodedString.subarray(
        valueStartPosition,
        currentPosition
      );
    }

    object[key] = valueResult.decodedValue;
  }
  return { decodedValue: object, index: currentPosition + 1 };
};

const decodeList = (
  encodedString: Buffer,
  start: number
): { decodedValue: any[]; index: number } => {
  let array = [];
  let currentPosition = start + 1; // Skip the initial 'l'

  while (currentPosition < encodedString.length) {
    if (encodedString[currentPosition] === "e".charCodeAt(0)) {
      return { decodedValue: array, index: currentPosition + 1 };
    }

    let result = decode(encodedString, currentPosition);
    if (!result) throw new Error("Failed to decode list");

    array.push(result.decodedValue);
    currentPosition = result.index;
  }

  throw new Error("List not properly terminated");
};

const decodeString = (encodedString: Buffer, start: number) => {
  let decodedValue;
  let wordStartIndex = 0;
  let currentWordLength = 0;

  for (let i = start; i < encodedString.length; i++) {
    if (encodedString[i] === ":".charCodeAt(0)) {
      wordStartIndex = i + 1;
      currentWordLength = Number(encodedString.subarray(start, i).toString());
      decodedValue = encodedString.subarray(
        wordStartIndex,
        i + currentWordLength + 1
      );

      const index = i + currentWordLength + 1;

      return { decodedValue, index };
    }
  }
};

const decodeNumber = (encodedString: Buffer, start: number) => {
  let decodedValue;
  let numEnd = 0;

  for (let i = start; i < encodedString.length; i++) {
    if (encodedString[i] === "e".charCodeAt(0)) {
      numEnd = i;
      decodedValue = Number(
        encodedString.subarray(start + 1, numEnd).toString()
      );
      return { decodedValue, index: numEnd + 1 };
    }
  }
};

// ENCODING

export const encode = (value: BencodeValue): string => {
  if (typeof value === "string") {
    return encodeString(value);
  } else if (typeof value === "number") {
    return encodeNumber(value);
  } else if (Array.isArray(value)) {
    return encodeArray(value);
  } else if (typeof value === "object") {
    return encodeObject(value);
  }

  throw new Error(`Cannot encode value of type ${typeof value}`);
};

const encodeString = (value: string): string => {
  return `${value.length}:${value}`;
};

const encodeNumber = (value: number): string => {
  return `i${value}e`;
};

const encodeArray = (value: Array<any>): string => {
  let finalstr = value.map((val) => encode(val)).join("");
  return `l${finalstr}e`;
};

const encodeObject = (value: BencodeValue): string => {
  const keys = Object.keys(value).sort();
  let finalStr = keys
    .map((key) => {
      return (
        encodeString(key) +
        encode((value as { [key: string]: BencodeValue })[key])
      );
    })
    .join("");
  return `d${finalStr}e`;
};
