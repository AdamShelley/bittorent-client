import path from "path";
import fs from "fs";
import type { Peer } from "../peer-protocol/peer";

export class FileManager {
  private torrentInfo: any;
  private outputFile: number | null = null;
  private outputFolder: string | null = null;
  private outputPath: string = "";
  private resumeFilePath: string | null = null;

  private piecesSinceLastResume: number = 0;
  private lastResumeWrite: number = Date.now();
  private readonly PIECES_BEFORE_RESUME = 50;
  private readonly SECONDS_BEFORE_RESUME = 30;

  constructor(torrentInfo: any) {
    this.torrentInfo = torrentInfo;
    const fullFileName = this.torrentInfo.name.toString();
    const lastDotIndex = fullFileName.lastIndexOf(".");
    const folderName =
      lastDotIndex > 0 ? fullFileName.substring(0, lastDotIndex) : fullFileName;

    // Create download folder structure
    this.outputFolder = path.join(process.cwd(), "downloaded", folderName);
    fs.mkdirSync(this.outputFolder, { recursive: true });

    // File path
    this.outputPath = path.join(this.outputFolder, fullFileName);

    // Open or create the file
    const fileExists = fs.existsSync(this.outputPath);
    this.outputFile = fs.openSync(this.outputPath, fileExists ? "r+" : "w");

    // Resume file path (in the same folder as the download)
    this.resumeFilePath = path.join(this.outputFolder, ".resume.json");
  }

  writePieceToFile(
    result: {
      status: string;
      pieceIndex: number;
      buffer?: Buffer;
      pieceSize?: number;
      peersToCancel?: Set<any>;
    },
    pieceData: { pieceIndex: number },
    pieceLength: number
  ) {
    fs.writeSync(
      this.getOutputFile()!,
      result.buffer!,
      0,
      result.pieceSize,
      pieceData.pieceIndex * pieceLength
    );
  }

  writeToResume(pieces: Set<number>, force: boolean = false) {
    this.piecesSinceLastResume++;
    const secondsSinceLastWrite = (Date.now() - this.lastResumeWrite) / 1000;

    // Only write if we've hit thresholds OR it's forced (for shutdown)
    if (
      force ||
      this.piecesSinceLastResume >= this.PIECES_BEFORE_RESUME ||
      secondsSinceLastWrite >= this.SECONDS_BEFORE_RESUME
    ) {
      fs.writeFileSync(
        path.join(this.getOutputFolder()!, ".resume.json"),
        JSON.stringify([...pieces])
      );
      this.piecesSinceLastResume = 0;
      this.lastResumeWrite = Date.now();
    }
  }

  getResumeJsonFile() {
    if (this.resumeFilePath && fs.existsSync(this.resumeFilePath)) {
      const completed = JSON.parse(
        fs.readFileSync(this.resumeFilePath, "utf8")
      );
      return completed;
    }
  }

  readFilePiece(
    buffer: Buffer,
    requestPiece: { length: number; pieceIndex: number; offset: number },
    position: number,
    peer: Peer
  ) {
    fs.read(
      this.getOutputFile()!,
      buffer,
      0,
      requestPiece.length,
      position,
      (err, bytesRead) => {
        if (err) {
          console.error(
            `Error reading piece ${requestPiece.pieceIndex}:`,
            err.message
          );
          return;
        }

        if (bytesRead !== requestPiece.length) {
          console.error(
            `Short read: expected ${requestPiece.length}, got ${bytesRead}`
          );
          return;
        }

        console.log("Sending a piece to a peer");

        peer.sendPiece(requestPiece.pieceIndex, requestPiece.offset, buffer);
      }
    );
  }

  closeFile() {
    fs.closeSync(this.getOutputFile()!);
  }

  getOutputFile() {
    return this.outputFile;
  }

  getOutputFolder() {
    return this.outputFolder;
  }

  getOutputPath() {
    return this.outputPath;
  }

  getResumeFilePath() {
    return this.resumeFilePath ?? null;
  }
}
