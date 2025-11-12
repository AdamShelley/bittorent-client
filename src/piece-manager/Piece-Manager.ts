import crypto from "crypto";
import type { Peer } from "../peer-protocol/peer";
import { SETTINGS } from "../settings/settings";

export class PieceManager {
  totalPieces: number = 0;
  pieceLength: number = 0;
  totalFileSize: number = 0;
  torrentPieces: Buffer | null = null;

  completedPieces: Set<number> = new Set();
  inProgressPieces: Set<number> = new Set();
  piecesNeeded: Set<number> = new Set();

  pieceBuffers: Map<number, Buffer> = new Map();
  pieceBlockCounts: Map<number, number> = new Map();
  receivedBlocks: Map<number, Set<number>> = new Map();

  peerPieces: Map<number, Set<Peer>> = new Map();
  isEndgameMode: boolean = false;

  constructor(
    totalPieces: number,
    pieceLength: number,
    totalFileSize: number,
    torrentPieces: Buffer
  ) {
    this.totalPieces = totalPieces;
    this.pieceLength = pieceLength;
    this.totalFileSize = totalFileSize;
    this.torrentPieces = torrentPieces;

    for (let i = 0; i < this.totalPieces; i++) {
      this.piecesNeeded.add(i);
    }
  }

  markPieceComplete = (pieceIndex: number) => {
    this.completedPieces.add(pieceIndex);
    this.piecesNeeded.delete(pieceIndex);
  };

  getPieceToDownload = (peer: Peer) => {
    for (let piece of this.piecesNeeded) {
      if (
        peer.hasPiece(piece) &&
        (this.isEndgameMode || !this.inProgressPieces.has(piece))
      ) {
        return piece;
      }
    }

    return null;
  };

  getPieceBlocks = (
    pieceIndex: number
  ): { offset: number; length: number }[] => {
    let pieceSize;
    if (pieceIndex === this.totalPieces - 1) {
      pieceSize = this.totalFileSize - pieceIndex * this.pieceLength;
    } else {
      pieceSize = this.pieceLength;
    }

    // total blocks needed for this piece
    const totalBlocks = Math.ceil(pieceSize / SETTINGS.BLOCK_SIZE);

    // How many to request?
    let blocksToRequest;
    if (this.isEndgameMode) {
      blocksToRequest = totalBlocks;
    } else {
      blocksToRequest = Math.min(5, totalBlocks);
    }

    // Build array of block reqeuest
    const blocks = [];

    for (let i = 0; i < blocksToRequest; i++) {
      let offset = i * SETTINGS.BLOCK_SIZE;

      // Last block might be smaller
      let length;
      if (offset + SETTINGS.BLOCK_SIZE > pieceSize) {
        length = pieceSize - offset;
      } else {
        length = SETTINGS.BLOCK_SIZE;
      }

      blocks.push({ offset, length });
    }

    return blocks;
  };

  trackPeerAssignment = (pieceIndex: number, peer: Peer) => {
    this.inProgressPieces.add(pieceIndex);

    if (!this.peerPieces.has(pieceIndex)) {
      this.peerPieces.set(pieceIndex, new Set());
    }
    this.peerPieces.get(pieceIndex)!.add(peer);
  };

  onBlockReceived = (pieceIndex: number, offset: number, block: Buffer) => {
    if (!this.receivedBlocks.has(pieceIndex)) {
      this.receivedBlocks.set(pieceIndex, new Set());
    }

    const blocksForThisPiece = this.receivedBlocks.get(pieceIndex)!;
    if (blocksForThisPiece.has(offset)) {
      return {
        status: "incomplete",
        pieceIndex,
      };
    }

    blocksForThisPiece.add(offset);

    if (!this.pieceBuffers.has(pieceIndex)) {
      const bufferSize =
        pieceIndex === this.totalPieces - 1
          ? this.totalFileSize - pieceIndex * this.pieceLength
          : this.pieceLength;

      this.pieceBuffers.set(pieceIndex, Buffer.alloc(bufferSize));
    }

    block.copy(this.pieceBuffers.get(pieceIndex)!, offset);

    const currentCount = this.pieceBlockCounts.get(pieceIndex) || 0;
    this.pieceBlockCounts.set(pieceIndex, currentCount + 1);

    const actualPieceSize =
      pieceIndex === this.totalPieces - 1
        ? this.totalFileSize - pieceIndex * this.pieceLength
        : this.pieceLength;

    const expectedBlocks = Math.ceil(actualPieceSize / SETTINGS.BLOCK_SIZE);

    if (currentCount + 1 === expectedBlocks) {
      // Validate the piece hash
      const expectedHash = this.torrentPieces?.subarray(
        pieceIndex * 20,
        (pieceIndex + 1) * 20
      );

      const actualHash = crypto
        .createHash("sha1")
        .update(this.pieceBuffers.get(pieceIndex)!)
        .digest();

      if (!expectedHash?.equals(actualHash)) {
        console.log(`Hash mismatch for piece ${pieceIndex}, retrying`);
        this.inProgressPieces.delete(pieceIndex);
        this.pieceBuffers.delete(pieceIndex);
        this.pieceBlockCounts.delete(pieceIndex);
        this.receivedBlocks.delete(pieceIndex);
        return {
          status: "failed",
          pieceIndex,
        };
      }

      const buffer = this.pieceBuffers.get(pieceIndex);
      const pieceSize = actualPieceSize;
      let peersToCancel = undefined;

      // If endgame mode:
      if (this.isEndgameMode && this.peerPieces.has(pieceIndex)) {
        peersToCancel = this.peerPieces.get(pieceIndex);
        // Clean up
        this.peerPieces.delete(pieceIndex);
      }

      // Update tracking
      this.inProgressPieces.delete(pieceIndex);
      this.completedPieces.add(pieceIndex);
      this.piecesNeeded.delete(pieceIndex);
      this.pieceBuffers.delete(pieceIndex);
      this.pieceBlockCounts.delete(pieceIndex);
      this.receivedBlocks.delete(pieceIndex);

      if (this.piecesNeeded.size <= 20) {
        this.isEndgameMode = true;
      }

      return {
        status: "complete",
        pieceIndex,
        buffer,
        pieceSize,
        peersToCancel,
      };
    } else {
      return { status: "incomplete", pieceIndex };
    }
  };

  getBlockCount = (pieceIndex: number) => {
    return this.pieceBlockCounts.get(pieceIndex) || 0;
  };

  getCompletedCount() {
    return this.completedPieces.size;
  }

  getCompletedPieces() {
    return this.completedPieces;
  }

  getPiecesNeededCount() {
    return this.piecesNeeded.size;
  }
  isDownloadComplete() {
    return;
  }

  setEndgameMode(isEndgame: boolean) {
    this.isEndgameMode = isEndgame;
  }
}
