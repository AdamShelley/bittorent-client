export type OpenFileResult = {
  canceled: boolean
  filePath?: string
  content?: string
}

export type DecodedTorrent = {
  length?: number
  name: Buffer
  'piece length': number
  pieces: Buffer
  files?: { length: number; path: Buffer[] }[]
}
