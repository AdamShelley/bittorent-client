import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { HeaderReturnType } from "../header-assembly/headers";
import {
  getPeerList,
  type PeerReturnType,
} from "../http-requests/contact-tracker";
import { Peer } from "../peer-protocol/Peer";

const BLOCK_SIZE = 16384;

export class Coordinator {
  torrent: any;
  peerList: PeerReturnType[] | null = null;
  headers: HeaderReturnType | null = null;
  totalPieces: number = 0;
  pieceLength: number = 16;
  totalFileSize: number = 0;
  infoHash: Buffer | null = null;
  bytesDownloaded: number = 0;
  downloadStartTime: number = 0;

  peers: Peer[] = [];

  completedPieces: Set<number> = new Set();
  inProgressPieces: Set<number> = new Set();
  piecesNeeded: Set<number> = new Set();

  pieceBuffers: Map<number, Buffer> = new Map();
  pieceBlockCounts: Map<number, number> = new Map();

  outputFile: number | null = null;
  outputFolder: string | null = null;
  outputPath: string = "";
  trackerInterval: number = 1800;

  constructor(
    peerList: PeerReturnType[],
    headerAssemblyResults: HeaderReturnType,
    torrentInfo: any
  ) {
    this.peerList = peerList;
    this.headers = headerAssemblyResults;
    this.torrent = torrentInfo;
    this.totalFileSize = torrentInfo.length;
    this.pieceLength = torrentInfo["piece length"];
    this.totalPieces = torrentInfo.pieces.length / 20;

    // Get the filename without extension
    const fullFileName = torrentInfo.name.toString();
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

    console.log(`📁 Download folder: ${this.outputFolder}`);
    console.log(`📄 Output file: ${this.outputPath}`);

    // Resume file path (in the same folder as the download)
    const resumeFilePath = path.join(this.outputFolder, ".resume.json");

    if (fs.existsSync(resumeFilePath)) {
      const completed = JSON.parse(fs.readFileSync(resumeFilePath, "utf8"));
      completed.forEach((pieceIndex: number) =>
        this.completedPieces.add(pieceIndex)
      );
      console.log(`📋 Resuming: ${completed.length} pieces already downloaded`);
    }

    for (let i = 0; i < this.totalPieces; i++) {
      if (!this.completedPieces.has(i)) {
        this.piecesNeeded.add(i);
      }
    }

    this.startPeerConnection();
    this.scheduleTrackerAnnounce();
  }

  startPeerConnection = () => {
    if (!this.peerList || !this.peerList.length || !this.headers) return;

    // Connect to up to 50 peers
    const peersToConnect = this.peerList.slice(0, 50);

    peersToConnect.forEach((peer) =>
      this.peers.push(new Peer(peer, this.headers!))
    );

    console.log(`Connecting to ${this.peers.length} peers...`);
    this.peers.forEach((peer: Peer) => this.attachListeners(peer));
  };

  attachListeners(peer: Peer) {
    peer.on("unchoke", () => this.onPeerUnchoked(peer));
    peer.on("piece", (pieceData) => this.onPeerReceivePiece(peer, pieceData));
    peer.on("disconnected", () => this.onPeerDisconnected(peer));
  }

  onPeerUnchoked = (peer: Peer) => {
    // Find a piece that's needed AND not in-progress AND the peer has
    return this.assignPieceToDownload(peer);
  };

  onPeerReceivePiece = (
    peer: Peer,
    pieceData: { pieceIndex: number; offset: number; block: Buffer }
  ) => {
    if (this.downloadStartTime === 0) {
      this.downloadStartTime = Date.now();
    }
    this.bytesDownloaded += pieceData.block.length;

    if (!this.pieceBuffers.has(pieceData.pieceIndex)) {
      const bufferSize =
        pieceData.pieceIndex === this.totalPieces - 1
          ? this.totalFileSize - pieceData.pieceIndex * this.pieceLength
          : this.pieceLength;

      this.pieceBuffers.set(pieceData.pieceIndex, Buffer.alloc(bufferSize));
    }

    pieceData.block.copy(
      this.pieceBuffers.get(pieceData.pieceIndex)!,
      pieceData.offset
    );

    const currentCount = this.pieceBlockCounts.get(pieceData.pieceIndex) || 0;
    this.pieceBlockCounts.set(pieceData.pieceIndex, currentCount + 1);

    const actualPieceSize =
      pieceData.pieceIndex === this.totalPieces - 1
        ? this.totalFileSize - pieceData.pieceIndex * this.pieceLength
        : this.pieceLength;

    const expectedBlocks = Math.ceil(actualPieceSize / BLOCK_SIZE);

    // Request next block to keep pipeline full (5 blocks ahead)
    const nextBlockOffset = pieceData.offset + 5 * BLOCK_SIZE;
    if (
      nextBlockOffset < actualPieceSize &&
      currentCount + 1 < expectedBlocks
    ) {
      const blockSize = Math.min(BLOCK_SIZE, actualPieceSize - nextBlockOffset);
      peer.requestPiece(pieceData.pieceIndex, nextBlockOffset, blockSize);
    }

    if (currentCount + 1 === expectedBlocks) {
      // Validate the piece hash
      const expectedHash = this.torrent.pieces.subarray(
        pieceData.pieceIndex * 20,
        (pieceData.pieceIndex + 1) * 20
      );

      const actualHash = crypto
        .createHash("sha1")
        .update(this.pieceBuffers.get(pieceData.pieceIndex)!)
        .digest();

      if (!expectedHash.equals(actualHash)) {
        console.log(
          `❌ Hash mismatch for piece ${pieceData.pieceIndex}, retrying`
        );
        this.inProgressPieces.delete(pieceData.pieceIndex);
        this.pieceBuffers.delete(pieceData.pieceIndex);
        this.pieceBlockCounts.delete(pieceData.pieceIndex);
        this.assignPieceToDownload(peer);
        return;
      }

      const isLastPiece = pieceData.pieceIndex === this.totalPieces - 1;
      const pieceSize = isLastPiece
        ? this.totalFileSize - pieceData.pieceIndex * this.pieceLength
        : this.pieceLength;

      fs.writeSync(
        this.outputFile!,
        this.pieceBuffers.get(pieceData.pieceIndex)!,
        0,
        pieceSize,
        pieceData.pieceIndex * this.pieceLength
      );

      // Update tracking
      this.inProgressPieces.delete(pieceData.pieceIndex);
      this.completedPieces.add(pieceData.pieceIndex);
      this.piecesNeeded.delete(pieceData.pieceIndex);
      this.pieceBuffers.delete(pieceData.pieceIndex);
      this.pieceBlockCounts.delete(pieceData.pieceIndex);

      const activePeers = this.peers.filter((p) => !p.peerChoking).length;
      const elapsedSeconds = (Date.now() - this.downloadStartTime) / 1000;
      const speedMBps = this.bytesDownloaded / elapsedSeconds / (1024 * 1024);
      const progress = (
        (this.completedPieces.size / this.totalPieces) *
        100
      ).toFixed(1);

      console.log(
        `Progress: ${this.completedPieces.size}/${
          this.totalPieces
        } (${progress}%) | Speed: ${speedMBps.toFixed(
          2
        )} MB/s | Active: ${activePeers} peers`
      );

      fs.writeFileSync(
        path.join(this.outputFolder!, ".resume.json"),
        JSON.stringify([...this.completedPieces])
      );

      if (this.completedPieces.size === this.totalPieces) {
        fs.closeSync(this.outputFile!);
        console.log("✅ Download complete!", this.outputPath);
        process.exit(0);
        return;
      }

      // Get next piece
      this.assignPieceToDownload(peer);
    }
  };

  // In Coordinator.ts
  assignPieceToDownload = (peer: Peer) => {
    for (const pieceIndex of this.piecesNeeded) {
      const peerHasPiece = peer.hasPiece(pieceIndex);

      if (!this.inProgressPieces.has(pieceIndex) && peerHasPiece) {
        this.inProgressPieces.add(pieceIndex);

        const pieceSize =
          pieceIndex === this.totalPieces - 1
            ? this.totalFileSize - pieceIndex * this.pieceLength
            : this.pieceLength;

        const blocksToRequest = Math.min(5, Math.ceil(pieceSize / BLOCK_SIZE));

        for (let i = 0; i < blocksToRequest; i++) {
          const offset = i * BLOCK_SIZE;
          const blockSize = Math.min(BLOCK_SIZE, pieceSize - offset);
          peer.requestPiece(pieceIndex, offset, blockSize);
        }

        return;
      }
    }
  };

  onPeerDisconnected = async (peer: Peer) => {
    console.log(`Peer ${peer.PEER_IP} disconnected`);

    // Remove from active peers
    this.peers = this.peers.filter((p) => p !== peer);

    // If we have fewer than 20 active peers, try to get more
    const activePeers = this.peers.filter((p) => !p.peerChoking).length;

    if (activePeers < 20) {
      console.log(`⚠️  Only ${activePeers} active peers, requesting more...`);

      if (!this.headers) return;

      const newPeers = await getPeerList(this.headers);
      const existingIPs = new Set(
        this.peers.map((p) => `${p.PEER_IP}:${p.PEER_PORT}`)
      );

      newPeers
        .filter((p) => !existingIPs.has(`${p.ip}:${p.port}`))
        .slice(0, 10)
        .forEach((peerInfo) => {
          const newPeer = new Peer(peerInfo, this.headers!);
          this.attachListeners(newPeer);
          this.peers.push(newPeer);
        });
    }
  };

  scheduleTrackerAnnounce = () => {
    setInterval(async () => {
      console.log("🔄 Re-announcing to tracker for fresh peers...");

      if (!this.headers) return;

      const newPeers = await getPeerList(this.headers);

      // Add peers we don't already have
      const existingIPs = new Set(
        this.peers.map((p) => `${p.PEER_IP}:${p.PEER_PORT}`)
      );
      const freshPeers = newPeers.filter(
        (peer) => !existingIPs.has(`${peer.ip}:${peer.port}`)
      );

      if (freshPeers.length > 0) {
        console.log(`✨ Found ${freshPeers.length} new peers`);

        freshPeers.slice(0, 20).forEach((peer) => {
          const newPeer = new Peer(peer, this.headers!);
          this.attachListeners(newPeer);
          this.peers.push(newPeer);
        });
      }
    }, this.trackerInterval * 1000);
  };
}

// TODO:
// Track which peer is downloading which piece (for better disconnect handling)
// Pipelining (request multiple blocks ahead)
// Rarest-first piece selection strategy
// Upload/seeding support
// Magnet link support
// DHT (Distributed Hash Table)
