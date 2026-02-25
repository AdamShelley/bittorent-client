export type BencodeValue =
  | string
  | number
  | Buffer
  | BencodeValue[]
  | { [key: string]: BencodeValue }

// DECODING
export const decode = (
  encodedString: string | Buffer,
  start: number
): { decodedValue: BencodeValue; index: number } => {
  const buffer =
    typeof encodedString === 'string' ? Buffer.from(encodedString, 'utf8') : encodedString
  if (buffer[start] === 'i'.charCodeAt(0)) {
    return decodeNumber(buffer, start)
  } else if (buffer[start] === 'l'.charCodeAt(0)) {
    return decodeList(buffer, start)
  } else if (buffer[start] === 'd'.charCodeAt(0)) {
    return decodeDictionary(buffer, start)
  } else {
    return decodeString(buffer, start)
  }
}

const decodeDictionary = (
  encodedString: Buffer,
  start: number
): { decodedValue: { [key: string]: BencodeValue }; index: number } => {
  const object: { [key: string]: BencodeValue } = {}
  let currentPosition = start + 1
  while (currentPosition < encodedString.length) {
    if (encodedString[currentPosition] === 'e'.charCodeAt(0)) {
      return { decodedValue: object, index: currentPosition + 1 }
    }
    const keyResult = decodeString(encodedString, currentPosition)
    currentPosition = keyResult.index
    const key = keyResult.decodedValue.toString('utf8')
    const valueStartPosition = currentPosition
    const valueResult = decode(encodedString, currentPosition)
    currentPosition = valueResult.index
    if (key === 'info') {
      object._rawInfo = encodedString.subarray(valueStartPosition, currentPosition).toString('utf8')
    }
    object[key] = valueResult.decodedValue
  }
  return { decodedValue: object, index: currentPosition + 1 }
}

const decodeList = (
  encodedString: Buffer,
  start: number
): { decodedValue: BencodeValue[]; index: number } => {
  const array: BencodeValue[] = []
  let currentPosition = start + 1
  while (currentPosition < encodedString.length) {
    if (encodedString[currentPosition] === 'e'.charCodeAt(0)) {
      return { decodedValue: array, index: currentPosition + 1 }
    }
    const result = decode(encodedString, currentPosition)
    array.push(result.decodedValue)
    currentPosition = result.index
  }
  throw new Error('List not properly terminated')
}

const decodeString = (
  encodedString: Buffer,
  start: number
): { decodedValue: Buffer; index: number } => {
  let wordStartIndex = 0
  let currentWordLength = 0
  for (let i = start; i < encodedString.length; i++) {
    if (encodedString[i] === ':'.charCodeAt(0)) {
      wordStartIndex = i + 1
      currentWordLength = Number(encodedString.subarray(start, i).toString())
      const decodedValue = encodedString.subarray(wordStartIndex, i + currentWordLength + 1)
      const index = i + currentWordLength + 1
      return { decodedValue, index }
    }
  }
  return { decodedValue: Buffer.alloc(0), index: encodedString.length }
}

const decodeNumber = (
  encodedString: Buffer,
  start: number
): { decodedValue: number; index: number } => {
  let numEnd = 0
  for (let i = start; i < encodedString.length; i++) {
    if (encodedString[i] === 'e'.charCodeAt(0)) {
      numEnd = i
      const decodedValue = Number(encodedString.subarray(start + 1, numEnd).toString())
      return { decodedValue, index: numEnd + 1 }
    }
  }
  return { decodedValue: 0, index: encodedString.length }
}

// ENCODING
export const encode = (value: BencodeValue): string => {
  if (typeof value === 'string') {
    return encodeString(value)
  } else if (typeof value === 'number') {
    return encodeNumber(value)
  } else if (Buffer.isBuffer(value)) {
    return encodeString(value.toString())
  } else if (Array.isArray(value)) {
    return encodeArray(value)
  } else if (typeof value === 'object') {
    return encodeObject(value)
  }
  throw new Error(`Cannot encode value of type ${typeof value}`)
}

const encodeString = (value: string): string => {
  return `${value.length}:${value}`
}

const encodeNumber = (value: number): string => {
  return `i${value}e`
}

const encodeArray = (value: BencodeValue[]): string => {
  const finalstr = value.map((val) => encode(val)).join('')
  return `l${finalstr}e`
}

const encodeObject = (value: { [key: string]: BencodeValue }): string => {
  const keys = Object.keys(value).sort()
  const finalStr = keys.map((key) => encodeString(key) + encode(value[key])).join('')
  return `d${finalStr}e`
}
