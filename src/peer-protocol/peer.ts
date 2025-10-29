import net from "net";
import type { Socket } from "net";
import type { PeerReturnType } from "../http-requests/contact-tracker";
import {
  decode,
  decodeHandshake,
  encodeHandshake,
  encodeInterested,
} from "./peer-protocol";
import type { HeaderReturnType } from "../header-assembly/headers";

export class Peer {
  peer: PeerReturnType | null = null;
  socket: Socket | null = null;
  handshakeDone: boolean = false;
  PEER_PORT: number | null = null;
  PEER_IP: string | null = null;
  clientInfoHash: Buffer | null = null;
  clientPeerId: Buffer | null = null;

  constructor(peer: PeerReturnType, headerAssemblyResults: HeaderReturnType) {
    this.peer = peer;
    this.PEER_IP = peer.ip;
    this.PEER_PORT = peer.port;
    this.clientInfoHash = headerAssemblyResults.info_hash;
    this.clientPeerId = headerAssemblyResults.peer_id;
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
      console.log(`Connected to ${this.PEER_IP}:${this.PEER_PORT}`);
      this.socket?.write(handshake);
      console.log("Handshake sent.");
    });

    this.socket.on("connect", () => {
      console.log("Connected");
    });

    this.socket.on("data", (data) => {
      console.log("Receiving some data");
      if (!this.handshakeDone) {
        const res = decodeHandshake(data);
        console.log("🤝 Handshake received:", res);

        if (!this.clientInfoHash) {
          throw new Error("Client info hash is not initialized");
        }

        const matchingHash = this.checkInfoHash(
          this.clientInfoHash,
          res.info_hash
        );

        if (matchingHash === 0) {
          // 0 is match, -1 and 1 is not matching
          throw new Error("Hashes do not match");
        }

        this.handshakeDone = true;
        this.socket?.write(encodeInterested());
      } else {
        const parsed = this.parseMessage(data);
        if (parsed && parsed.messageId !== undefined) {
          const { messageId, result } = parsed;
          if (messageId === 5) {
            console.log("Bitfield!");
            console.log(result);
          }
        }
      }
    });

    this.socket.on("error", (err) => {
      console.warn(err);
    });
  }

  parseMessage(data: Buffer) {
    if (data.length < 4) return; // wait for full message
    const length = data.readUInt32BE(0);
    if (length === 0) {
      console.log("Keep-alive received");
      return {};
    }
    const messageId = data.readUInt8(4);
    const result = decode(data);
    return { messageId, result };
  }

  checkInfoHash = (clientHash: Buffer, peerHash: Buffer) => {
    return Buffer.compare(clientHash, peerHash);
  };

  // Handle each message type
  // Process the buffer
  // Methods to request pieces
}

// TODO:
// Once you have their bitfield
// → Decide if there are pieces you don’t have.
// → If yes → send interested message.
// → If no → send not interested.

// If they unchoke you
// → You can now send request messages for specific piece blocks.
// → Each request specifies: piece index, offset, length.

// When data (piece) arrives
// → Verify SHA-1 hash matches the one in the torrent’s info.
// → Mark it as complete.
// → Possibly send have messages to other peers.

// Keep-alive
// → Every 2 minutes or so, if no other messages are sent.
