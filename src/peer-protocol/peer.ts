import net from "net";
import type { Socket } from "net";
import type { PeerReturnType } from "../http-requests/contact-tracker";
import {
  decode,
  decodeHandshake,
  encodeBitfield,
  encodeUnchoke,
  encodeCancel,
  encodeHandshake,
  encodeInterested,
  encodePiece,
  encodeRequest,
} from "./peer-protocol";
import type { HeaderReturnType } from "../header-assembly/headers";
import EventEmitter from "events";

export class Peer extends EventEmitter {
  peer: PeerReturnType | null = null;
  socket: Socket | null = null;
  clientBitfield: Set<number> | null = null;
  totalPieces: number = 0;
  handshakeDone: boolean = false;
  PEER_PORT: number | null = null;
  PEER_IP: string | null = null;
  clientInfoHash: Buffer | null = null;
  clientPeerId: Buffer | null = null;
  buffer: Buffer = Buffer.alloc(0);
  bitfield: Buffer = Buffer.alloc(0);
  clientBitfieldBuffer: Buffer = Buffer.alloc(0);
  //   Statuses
  amChoking: boolean = true;
  amInterested: boolean = false;
  peerChoking: boolean = true;
  peerInterested: boolean = false;

  requestQueue: Array<{ pieceIndex: number; offset: number; length: number }> =
    [];
  maxPipelineRequests: number = 15;
  pendingRequests: Array<{
    pieceIndex: number;
    offset: number;
    length: number;
  }> = [];

  constructor(
    peer: PeerReturnType,
    headerAssemblyResults: HeaderReturnType,
    completedPieces: Set<number>,
    totalPieces: number
  ) {
    super();
    this.peer = peer;
    this.PEER_IP = peer.ip;
    this.PEER_PORT = peer.port;
    this.clientInfoHash = headerAssemblyResults.info_hash;
    this.clientPeerId = headerAssemblyResults.peer_id;
    this.totalPieces = totalPieces;
    this.clientBitfield = completedPieces;

    this.connect();
  }

  connect() {
    if (
      !this.clientInfoHash ||
      !this.clientPeerId ||
      !this.PEER_PORT ||
      !this.PEER_IP
    )
      return;
    const handshake = encodeHandshake(this.clientInfoHash, this.clientPeerId);

    this.socket = net.createConnection(this.PEER_PORT, this.PEER_IP, () => {
      // console.log(`Connected to ${this.PEER_IP}:${this.PEER_PORT}`);
      this.socket?.write(handshake);
    });
    this.socket.on("connect", () => console.log("Connected"));
    this.socket.on("data", (data) => this.handleData(data));
    this.socket.on("close", () => this.emit("disconnected"));
    this.socket.on("error", (err) => {
      this.handleError(err);
      this.emit("disconnected");
    });
  }

  checkInfoHash = (clientHash: Buffer, peerHash: Buffer) => {
    return clientHash.equals(peerHash);
  };

  handleData = (data: Buffer) => {
    if (!this.handshakeDone) {
      const res = decodeHandshake(data);
      // console.log("🤝 Handshake received:", res);

      if (data.length > 68) {
        const leftover = data.subarray(68);
        this.buffer = Buffer.concat([this.buffer, leftover]);
      }

      if (!this.clientInfoHash) {
        throw new Error("Client info hash is not initialized");
      }

      const matchingHash = this.checkInfoHash(
        this.clientInfoHash,
        res.info_hash
      );

      if (!matchingHash) {
        throw new Error("Hashes do not match");
      }

      this.handshakeDone = true;

      const encodedBitfield = encodeBitfield(
        this.constructBitfield(this.clientBitfield!, this.totalPieces)
      );
      console.log("Sending encoded bitfield: ", encodedBitfield);
      this.socket?.write(encodedBitfield);

      this.socket?.write(encodeInterested());

      this.amInterested = true;
    } else {
      this.buffer = Buffer.concat([this.buffer, data]);

      while (this.buffer.length >= 4) {
        // Read the first 4 bytes for length
        const length = this.buffer.subarray(0, 4);
        const convertedLength = length.readUInt32BE(0);

        // Handle keep alive
        if (convertedLength === 0) {
          this.buffer = this.buffer.subarray(4);
          continue;
        }

        if (this.buffer.length >= 4 + convertedLength) {
          const message = this.buffer.subarray(0, convertedLength + 4);

          const parsed = decode(message);
          // console.log("Message ID:", parsed?.id);

          if (parsed.id === 2) {
            // Interested
            this.emit("interested");
            this.peerInterested = true;
          } else if (parsed.id === 3) {
            // Not interested
            this.emit("not-interested");
            this.peerInterested = false;
          } else if (parsed.id === 5) {
            if (parsed?.result?.bitfield) {
              this.bitfield = parsed.result.bitfield;
            }
          } else if (parsed.id === 1) {
            // console.log("📣 Received UNCHOKE from peer");
            this.emit("unchoke");
            this.peerChoking = false;
          } else if (parsed.id === 0) {
            // console.log("🚫 Received CHOKE from peer");
            this.peerChoking = true;
          } else if (parsed.id === 4) {
            // Handle 'have' messages - update bitfield
            const pieceIndex = parsed.result?.pieceIndex;
            if (pieceIndex !== undefined) {
              this.markPieceAsAvailable(pieceIndex);
            }
          } else if (parsed.id === 6) {
            // For Seeding
            this.emit("request", {
              pieceIndex: parsed.result.pieceIndex,
              offset: parsed.result.offset,
              block: parsed.result.block,
            });
          } else if (parsed.id === 7) {
            this.pendingRequests = this.pendingRequests.filter((block) => {
              if (
                !(
                  block.pieceIndex === parsed.result.pieceIndex &&
                  block.offset === parsed.result.offset
                )
              ) {
                return block;
              }
            });

            this.emit("piece", {
              pieceIndex: parsed.result.pieceIndex,
              offset: parsed.result.offset,
              block: parsed.result.block,
            });

            // Send more requests to keep pipeline full
            this.fillPipeline();
          }

          this.buffer = this.buffer.subarray(4 + convertedLength);
        } else {
          break;
        }
      }
    }
  };

  fillPipeline() {
    while (
      this.pendingRequests.length < this.maxPipelineRequests &&
      this.requestQueue.length > 0
    ) {
      const req = this.requestQueue.shift()!;
      if (!req) continue;
      this.socket?.write(encodeRequest(req.pieceIndex, req.offset, req.length));
      this.pendingRequests.push({
        pieceIndex: req.pieceIndex,
        offset: req.offset,
        length: req.length,
      });
    }
  }

  handleError = (error: NodeJS.ErrnoException) => {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ECONNREFUSED") {
      console.log(`Peer ${this.PEER_IP} refused connection`);
      // Don't retry, move to next peer
    } else if (nodeError.code === "ENETUNREACH") {
    } else {
      console.warn(error);
    }
  };

  hasPiece = (pieceIndex: number): boolean => {
    const byteIndex = Math.floor(pieceIndex / 8);
    if (byteIndex >= this.bitfield.length) return false;

    const bitIndex = pieceIndex % 8;
    const byte = this.bitfield[byteIndex];
    const mask = 1 << (7 - bitIndex);

    return (byte & mask) !== 0;
  };

  requestPiece = (pieceIndex: number, offset: number, length: number) => {
    this.requestQueue.push({ pieceIndex, offset, length });
    this.fillPipeline();
  };

  markPieceAsAvailable = (pieceIndex: number) => {
    const byteIndex = Math.floor(pieceIndex / 8);
    const bitIndex = pieceIndex % 8;

    // Expand bitfield if necessary
    if (byteIndex >= this.bitfield.length) {
      const newBitfield = Buffer.alloc(byteIndex + 1);
      this.bitfield.copy(newBitfield);
      this.bitfield = newBitfield;
    }

    // Set the bit
    const mask = 1 << (7 - bitIndex);
    this.bitfield[byteIndex] |= mask;
  };

  sendPiece(pieceIndex: number, offset: number, block: Buffer) {
    const message = encodePiece(pieceIndex, offset, block);
    this.socket?.write(message);
  }

  encodeUnchokeHelper = () => {
    const unchoked = encodeUnchoke();
    this.socket?.write(unchoked);
  };

  cancelPiece = (pieceIndex: number) => {
    this.requestQueue = this.requestQueue.filter((block) => {
      if (block.pieceIndex === pieceIndex) {
        this.socket?.write(
          encodeCancel(block.pieceIndex, block.offset, block.length)
        );
        return false;
      }
      return true;
    });

    this.pendingRequests = this.pendingRequests.filter((block) => {
      if (block.pieceIndex === pieceIndex) {
        this.socket?.write(
          encodeCancel(block.pieceIndex, block.offset, block.length)
        );
        return false;
      }

      return true;
    });
  };

  constructBitfield = (
    completedPieces: Set<number>,
    totalPieces: number
  ): Buffer => {
    const bytesNeeded = Math.ceil(totalPieces / 8);
    const buffer = Buffer.alloc(bytesNeeded);

    completedPieces.forEach((piece) => {
      this.setBitInBuffer(buffer, piece);
    });

    return buffer;
  };

  setBitInBuffer = (buffer: Buffer, pieceIndex: number) => {
    const byteIndex = Math.floor(pieceIndex / 8);
    const bitIndex = pieceIndex % 8;

    // Set the bit
    const mask = 1 << (7 - bitIndex);
    buffer[byteIndex] |= mask;

    return buffer;
  };
}
