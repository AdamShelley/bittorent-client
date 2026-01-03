import path from 'path'
import fs from 'fs'
import type { Peer } from '../peer-protocol/peer'

interface TorrentFile {
  path: Buffer[]
  length: number
}
export class FileManager {
  private torrentInfo: any
  private outputFile: number | null = null
  private outputFolder: string | null = null
  private outputPath: string = ''
  private resumeFilePath: string | null = null

  private piecesSinceLastResume: number = 0
  private lastResumeWrite: number = Date.now()
  private readonly PIECES_BEFORE_RESUME = 50
  private readonly SECONDS_BEFORE_RESUME = 30

  private files: Array<{
    path: string
    fd: number
    length: number
    offset: number
  }> = []

  constructor(torrentInfo: any, downloadLocation: string) {
    this.torrentInfo = torrentInfo
    console.log(downloadLocation)
    if (downloadLocation.length) {
      this.outputFolder = downloadLocation
    }

    if (this.torrentInfo.files) {
      this.setupMultiFile()
    } else {
      this.setupSingleFile()
    }
  }

  setupMultiFile = () => {
    const rootFolder = this.torrentInfo.name.toString()

    let baseDir = ''
    if (this.outputFolder) {
      baseDir = path.join(this.outputFolder, rootFolder)
    } else {
      baseDir = path.join(process.cwd(), 'downloaded', rootFolder)
    }

    this.outputFolder = baseDir
    let runningOffset = 0

    this.torrentInfo.files.forEach((file: TorrentFile) => {
      // 1. Build the path
      const pathArray: string[] = file.path.map((p: Buffer) => p.toString())
      const fullPath: string = path.join(baseDir, ...pathArray)

      // 2. Create directories
      fs.mkdirSync(path.dirname(fullPath), { recursive: true })

      // 3. Open file
      const fileExists: boolean = fs.existsSync(fullPath)
      const fd: number = fs.openSync(fullPath, fileExists ? 'r+' : 'w')

      // 4. Calculate offset
      const fileOffset: number = runningOffset
      runningOffset += file.length

      this.files.push({
        path: fullPath,
        fd: fd,
        length: file.length,
        offset: fileOffset
      })
    })

    // Set resume file path
    this.resumeFilePath = path.join(baseDir, '.resume.json')
  }

  setupSingleFile = () => {
    const fullFileName = this.torrentInfo.name.toString()
    const lastDotIndex = fullFileName.lastIndexOf('.')
    const folderName = lastDotIndex > 0 ? fullFileName.substring(0, lastDotIndex) : fullFileName

    let baseDir = ''
    if (this.outputFolder) {
      baseDir = path.join(this.outputFolder, folderName)
    } else {
      baseDir = path.join(process.cwd(), 'downloaded', folderName)
    } // Create download folder structure

    this.outputFolder = baseDir

    fs.mkdirSync(this.outputFolder, { recursive: true })

    // File path
    this.outputPath = path.join(this.outputFolder, fullFileName)

    // Open or create the file
    const fileExists = fs.existsSync(this.outputPath)
    this.outputFile = fs.openSync(this.outputPath, fileExists ? 'r+' : 'w')

    // Resume file path (in the same folder as the download)
    this.resumeFilePath = path.join(this.outputFolder, '.resume.json')
  }

  writePieceToFile(
    result: {
      status: string
      pieceIndex: number
      buffer?: Buffer
      pieceSize?: number
      peersToCancel?: Set<any>
    },
    pieceData: { pieceIndex: number },
    pieceLength: number
  ) {
    const pieceStart = pieceData.pieceIndex * pieceLength
    const pieceEnd = pieceData.pieceIndex * pieceLength + (result?.pieceSize || 0)

    if (this.files.length > 0) {
      this.files.forEach((file) => {
        const fileStart = file.offset
        const fileEnd = file.offset + file.length

        if (pieceStart < fileEnd && fileStart < pieceEnd) {
          const overlapStart = Math.max(pieceStart, fileStart)
          const overlapEnd = Math.min(pieceEnd, fileEnd)
          const bytesToWrite = overlapEnd - overlapStart

          const offsetInFile = overlapStart - fileStart
          const offsetInBuffer = overlapStart - pieceStart

          fs.writeSync(file.fd, result.buffer!, offsetInBuffer, bytesToWrite, offsetInFile)
        }
      })
    } else {
      fs.writeSync(this.getOutputFile()!, result.buffer!, 0, result.pieceSize, pieceStart)
    }
  }

  writeToResume(pieces: Set<number>, force: boolean = false) {
    this.piecesSinceLastResume++
    const secondsSinceLastWrite = (Date.now() - this.lastResumeWrite) / 1000

    // Only write if we've hit thresholds OR it's forced (for shutdown)
    if (
      force ||
      this.piecesSinceLastResume >= this.PIECES_BEFORE_RESUME ||
      secondsSinceLastWrite >= this.SECONDS_BEFORE_RESUME
    ) {
      fs.writeFileSync(
        path.join(this.getOutputFolder()!, '.resume.json'),
        JSON.stringify([...pieces])
      )
      this.piecesSinceLastResume = 0
      this.lastResumeWrite = Date.now()
    }
  }

  getResumeJsonFile() {
    if (this.resumeFilePath && fs.existsSync(this.resumeFilePath)) {
      const completed = JSON.parse(fs.readFileSync(this.resumeFilePath, 'utf8'))
      return completed
    }
  }

  readFilePiece(
    buffer: Buffer,
    requestPiece: { length: number; pieceIndex: number; offset: number },
    position: number,
    peer: Peer
  ) {
    fs.read(this.getOutputFile()!, buffer, 0, requestPiece.length, position, (err, bytesRead) => {
      if (err) {
        console.error(`Error reading piece ${requestPiece.pieceIndex}:`, err.message)
        return
      }

      if (bytesRead !== requestPiece.length) {
        console.error(`Short read: expected ${requestPiece.length}, got ${bytesRead}`)
        return
      }

      console.log('Sending a piece to a peer')

      peer.sendPiece(requestPiece.pieceIndex, requestPiece.offset, buffer)
    })
  }

  closeFile() {
    if (this.files.length > 0) {
      // Multi-file: close all files
      this.files.forEach((file) => {
        fs.closeSync(file.fd)
      })
    } else {
      // Single-file: close thpe one file
      fs.closeSync(this.getOutputFile()!)
    }
  }

  getFiles() {
    return this.files
  }

  getOutputFile() {
    return this.outputFile
  }

  getOutputFolder() {
    return this.outputFolder
  }

  getOutputPath() {
    return this.outputPath
  }

  getResumeFilePath() {
    return this.resumeFilePath ?? null
  }
}
