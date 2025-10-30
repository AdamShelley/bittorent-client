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
  buffer: Buffer = Buffer.alloc(0);
  bitfield: Buffer = Buffer.alloc(0);

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

    this.socket.on("error", (err) => {
      const nodeError = err as NodeJS.ErrnoException;
      if (nodeError.code === "ECONNREFUSED") {
        console.log(`Peer ${this.PEER_IP} refused connection`);
        // Don't retry, move to next peer
      } else if (nodeError.code === "ENETUNREACH") {
      } else {
        console.warn(err);
      }
    });

    this.socket.on("data", (data) => {
      console.log("Receiving some data");
      if (!this.handshakeDone) {
        const res = decodeHandshake(data);
        console.log("🤝 Handshake received:", res);

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
      } else {
        this.buffer = Buffer.concat([this.buffer, data]);

        while (this.buffer.length >= 4) {
          // Read the first 4 bytes for length
          const length = this.buffer.subarray(0, 4);
          const convertedLength = length.readUInt32BE(0);
          console.log("ConvertedLength:", convertedLength);

          // Handle keep alive
          if (convertedLength === 0) {
            this.buffer = this.buffer.subarray(4);
            continue;
          }

          if (this.buffer.length >= 4 + convertedLength) {
            console.log("Extracting message");
            const message = this.buffer.subarray(0, convertedLength + 4);
            console.log("Message bytes:", message);

            const parsed = decode(message);
            console.log("First byte (should be message ID):", parsed?.id);

            if (parsed.id === 5) {
              //   this.bitfield = parsed.result;
            }

            this.buffer = this.buffer.subarray(4 + convertedLength);
          } else {
            break;
          }
        }
      }
    });

    this.socket.on("error", (err) => {
      console.warn(err);
    });
  }

  checkInfoHash = (clientHash: Buffer, peerHash: Buffer) => {
    return clientHash.equals(peerHash);
  };
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
