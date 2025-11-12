import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { HeaderReturnType } from "../header-assembly/headers";
import {
  getPeerList,
  type PeerReturnType,
} from "../http-requests/contact-tracker";
import { Peer } from "../peer-protocol/peer";
import { PieceManager } from "../piece-manager/Piece-Manager";
import { SETTINGS } from "../settings/settings";

const BLOCK_SIZE = 16384;
const MAX_UNCHOKED_PEERS = 3;

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

  lastProgressLog: number = 0;

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

  isEndgameMode: boolean = false;
  peerPieces: Map<number, Set<Peer>> = new Map();
  receivedBlocks: Map<number, Set<number>> = new Map();

  interestedPeers: Set<Peer> = new Set();
  unchokedPeers: Set<Peer> = new Set();

  pieceManager: PieceManager;

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

    this.pieceManager = new PieceManager(
      this.totalPieces,
      this.pieceLength,
      this.totalFileSize,
      this.torrent
    );

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

    // Resume file path (in the same folder as the download)
    const resumeFilePath = path.join(this.outputFolder, ".resume.json");

    if (fs.existsSync(resumeFilePath)) {
      const completed = JSON.parse(fs.readFileSync(resumeFilePath, "utf8"));
      completed.forEach((pieceIndex: number) =>
        this.completedPieces.add(pieceIndex)
      );
    }

    for (let i = 0; i < this.totalPieces; i++) {
      if (!this.completedPieces.has(i)) {
        this.piecesNeeded.add(i);
      }
    }

    this.startPeerConnection();
    this.unchokeRotation();

    setInterval(() => {
      this.unchokeRotation();
    }, 30 * 1000);

    this.scheduleTrackerAnnounce();
  }

  startPeerConnection = () => {
    if (!this.peerList || !this.peerList.length || !this.headers) return;

    // Connect to up to 50 peers
    const peersToConnect = this.peerList.slice(0, 100);

    peersToConnect.forEach((peer) =>
      this.peers.push(
        new Peer(peer, this.headers!, this.completedPieces, this.totalPieces)
      )
    );
    console.log(`Connecting to ${this.peers.length} peers...`);
    this.peers.forEach((peer: Peer) => this.attachListeners(peer));
  };

  attachListeners(peer: Peer) {
    peer.on("unchoke", () => this.onPeerUnchoked(peer));
    peer.on("piece", (pieceData) => this.onPeerReceivePiece(peer, pieceData));
    peer.on("disconnected", () => this.onPeerDisconnected(peer));
    peer.on("request", (pieceData) => this.peerRequestPiece(peer, pieceData));
    peer.on("interested", () => this.onPeerInterested(peer));
    peer.on("not-interested", () => this.onPeerNotInterested(peer));
  }

  onPeerUnchoked = (peer: Peer) => {
    // Find a piece that's needed AND not in-progress AND the peer has
    return this.assignPieceToDownload(peer);
  };

  onPeerInterested = (peer: Peer) => {
    console.log(`> Peer ${peer.PEER_IP} is interested in our pieces`);

    this.interestedPeers?.add(peer);
  };

  onPeerNotInterested = (peer: Peer) => {
    this.interestedPeers?.delete(peer);
  };

  onPeerReceivePiece = (
    peer: Peer,
    pieceData: { pieceIndex: number; offset: number; block: Buffer }
  ) => {
    if (this.downloadStartTime === 0) {
      this.downloadStartTime = Date.now();
    }
    this.bytesDownloaded += pieceData.block.length;

    const result = this.pieceManager.onBlockReceived(
      pieceData.pieceIndex,
      pieceData.offset,
      pieceData.block
    );

    if (result.status === "incomplete") {
      // Pipeline next block - calculate and request next block
      const actualPieceSize =
        pieceData.pieceIndex === this.totalPieces - 1
          ? this.totalFileSize - pieceData.pieceIndex * this.pieceLength
          : this.pieceLength;

      let currentCount = this.pieceManager.getBlockCount(pieceData.pieceIndex);
      let expectedBlocks = Math.ceil(actualPieceSize / SETTINGS.BLOCK_SIZE);

      const nextBlockOffset = pieceData.offset + 5 * BLOCK_SIZE;
      if (
        nextBlockOffset < actualPieceSize &&
        currentCount + 1 < expectedBlocks
      ) {
        const blockSize = Math.min(
          SETTINGS.BLOCK_SIZE,
          actualPieceSize - nextBlockOffset
        );
        peer.requestPiece(pieceData.pieceIndex, nextBlockOffset, blockSize);
      }
    }

    if (result.status === "failed") {
      this.assignPieceToDownload(peer);
    }

    if (result.status === "complete") {
      // Write buffer to disk
      // Handle endgame peer cancellation (if result.peersToCancel exists)
      // Send have message to all peers
      // Update resume file
      // Log progress
      // Check if download complete
      // Assign next piece
    }
  };

  assignPieceToDownload = (peer: Peer) => {
    const pieceIndex = this.pieceManager.getPieceToDownload(peer);
    if (pieceIndex == null) return;

    const blocks = this.pieceManager.getPieceBlocks(pieceIndex);

    blocks?.forEach((block) => {
      peer.requestPiece(pieceIndex, block.offset, block.length);
    });

    this.pieceManager.trackPeerAssignment(pieceIndex, peer);
  };

  onPeerDisconnected = async (peer: Peer) => {
    // Remove from active peers
    this.peers = this.peers.filter((p) => p !== peer);
    this.interestedPeers.delete(peer);
    this.unchokedPeers.delete(peer);

    // If we have fewer than 20 active peers, try to get more
    const activePeers = this.peers.filter((p) => p.handshakeDone).length;

    if (activePeers < 20) {
      if (!this.headers) return;

      const newPeers = await getPeerList(this.headers);
      const existingIPs = new Set(
        this.peers.map((p) => `${p.PEER_IP}:${p.PEER_PORT}`)
      );

      newPeers
        .filter((p) => !existingIPs.has(`${p.ip}:${p.port}`))
        .slice(0, 10)
        .forEach((peerInfo) => {
          const newPeer = new Peer(
            peerInfo,
            this.headers!,
            this.completedPieces,
            this.totalPieces
          );
          this.attachListeners(newPeer);
          this.peers.push(newPeer);
        });
    }
  };

  scheduleTrackerAnnounce = () => {
    setInterval(async () => {
      // console.log("🔄 Re-announcing to tracker for fresh peers...");

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
        freshPeers.slice(0, 20).forEach((peer) => {
          const newPeer = new Peer(
            peer,
            this.headers!,
            this.completedPieces,
            this.totalPieces
          );
          this.attachListeners(newPeer);
          this.peers.push(newPeer);
        });
      }
    }, this.trackerInterval * 1000);
  };

  peerRequestPiece = (
    peer: Peer,
    requestPiece: { pieceIndex: number; offset: number; length: number }
  ) => {
    // Read the block from your file
    if (!this.completedPieces.has(requestPiece.pieceIndex)) {
      return;
    }

    if (!this.outputFile) return;

    const buffer = Buffer.alloc(requestPiece.length);
    const position =
      requestPiece.pieceIndex * this.pieceLength + requestPiece.offset;

    fs.read(
      this.outputFile,
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
  };

  unchokeRotation = () => {
    const interestedPeersArray = Array.from(this.interestedPeers);
    for (let i = 0; i < interestedPeersArray.length; i++) {
      const peer = interestedPeersArray[i];
      if (peer.amChoking) {
        peer.encodeUnchokeHelper();
        this.unchokedPeers.add(peer);
        if (this.unchokedPeers.size >= MAX_UNCHOKED_PEERS) {
          return;
        }
      }
    }
  };
}

// TODO:
// after download check all files against hash?
// Rarest-first piece selection strategy
// Magnet link support
// DHT (Distributed Hash Table)
