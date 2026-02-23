import net from 'net'
import EventEmitter from 'events'
import { PeerReturnType } from '../http-requests/contact-tracker'
import { MagnetHeaderReturnType } from '../magnet-links/magnet'
import { Socket } from 'net'
import { decode, decodeHandshake, encodeHandshake } from './peer-protocol'
import { decode as bencodeDecoder, encode } from '../bencode/bencode'
import crypto from 'crypto'

export class MetadataPeer extends EventEmitter {
  peer: PeerReturnType | null = null
  magnetResults: MagnetHeaderReturnType | null = null
  socket: Socket | null = null
  PEER_PORT: number | null = null
  PEER_IP: string | null = null
  handshakeDone: boolean = false
  buffer: Buffer = Buffer.alloc(0)
  PIECE_SIZE_MAX = 16384
  infoHashBuffer: Buffer = Buffer.alloc(0)
  metadataPieces: Buffer[] = []
  metadataSize: number | null = null
  totalPieceCount: number = 0

  constructor(peer: PeerReturnType, magnetResults: MagnetHeaderReturnType) {
    super()
    this.peer = peer
    this.magnetResults = magnetResults
    this.PEER_PORT = peer.port
    this.PEER_IP = peer.ip

    this.getMetadata()
  }

  getMetadata(): void {
    if (!this.PEER_PORT || !this.PEER_IP || !this.magnetResults) return
    // Create the socket
    // Connect to the peer

    const encodedHandshake = encodeHandshake(
      this.magnetResults.info_hash,
      this.magnetResults.peer_id
    )

    this.socket = net.createConnection(this.PEER_PORT, this.PEER_IP)

    const CONNECT_TIMEOUT = 5000
    const connectTimer = setTimeout(() => {
      console.warn(`MetadataPeer connect to ${this.PEER_IP}:${this.PEER_PORT} timed out`)
      try {
        this.socket?.destroy()
      } catch {
        console.warn('Socket failed to destroy')
      }
      this.emit('disconnected')
    }, CONNECT_TIMEOUT)

    this.socket.once('connect', () => {
      clearTimeout(connectTimer)
      this.socket?.write(encodedHandshake)
    })

    this.socket.on('error', (err) => {
      console.error('MetadataPeer socket error:', err)
      try {
        this.socket?.destroy()
      } catch {
        console.warn('Socket failed to destroy')
      }
      this.emit('disconnected')
    })

    this.socket.on('close', () => {
      // peer closed connection
      this.emit('disconnected')
    })

    this.socket.setTimeout && this.socket.setTimeout(7000)
    this.socket.on('timeout', () => {
      console.warn(`MetadataPeer connection to ${this.PEER_IP}:${this.PEER_PORT} timed out`)
      try {
        this.socket?.destroy()
      } catch {
        console.warn('Socket failed to destroy')
      }
      this.emit('disconnected')
    })

    this.socket.on('data', (data) => this.handleData(data))
  }

  checkInfoHash = (clientHash: Buffer, peerHash: Buffer): boolean => {
    return clientHash.equals(peerHash)
  }

  handleData = (data: Buffer): void => {
    if (!this.handshakeDone) {
      try {
        const res = decodeHandshake(data)

        if (data.length > 68) {
          const leftover = data.subarray(68)
          this.buffer = Buffer.concat([this.buffer, leftover])
        }

        if (!this.magnetResults?.info_hash) {
          throw new Error('Client info hash is not initialized')
        }

        const matchingHash = this.checkInfoHash(this.magnetResults.info_hash, res.info_hash)

        if (!matchingHash) {
          throw new Error('Hashes do not match')
        }

        this.handshakeDone = true

        const payloadBuf = Buffer.from(encode({ m: { ut_metadata: 1 } }), 'utf8')
        const len = 2 + payloadBuf.length
        const header = Buffer.alloc(5)
        header.writeUInt32BE(len, 0)
        header[4] = 20

        const extHandshakeMsg = Buffer.concat([header, Buffer.from([0]), payloadBuf])
        this.socket?.write(extHandshakeMsg)
        this.messageParsing()
      } catch {
        // console.warn(
        //   `Handshake failed with ${this.PEER_IP}:`,
        //   e instanceof Error ? e.message : "Unknown error"
        // );
        this.socket?.destroy()
        this.emit('disconnected')
        return
      }
    } else {
      this.buffer = Buffer.concat([this.buffer, data])
      this.messageParsing()
    }
  }

  messageParsing(): void {
    while (this.buffer.length >= 4) {
      // Read the first 4 bytes for length
      const length = this.buffer.subarray(0, 4)
      const convertedLength = length.readUInt32BE(0)

      // Handle keep alive
      if (convertedLength === 0) {
        this.buffer = this.buffer.subarray(4)
        continue
      }

      if (this.buffer.length >= 4 + convertedLength) {
        const message = this.buffer.subarray(0, convertedLength + 4)
        const parsed = decode(message)
        this.buffer = this.buffer.subarray(4 + convertedLength)

        if (parsed.id === 20) {
          const decodedData = bencodeDecoder(parsed.result.data, 0)

          if (parsed.result.subId === 0) {
            this.metadataSize = decodedData?.decodedValue.metadata_size
            this.totalPieceCount = Math.ceil(
              decodedData?.decodedValue.metadata_size / this.PIECE_SIZE_MAX
            )

            const ut_metadata_value = decodedData?.decodedValue.m.ut_metadata

            // Divide metadata_size (21307) by 16384 and round up for number of pieces to request
            const pieceSize = Math.ceil(
              decodedData?.decodedValue.metadata_size / this.PIECE_SIZE_MAX
            )
            // For each piece send a request message
            for (let i = 0; i < pieceSize; i++) {
              const payloadBuf = Buffer.from(encode({ msg_type: 0, piece: i }), 'utf8')
              const len = 2 + payloadBuf.length
              const header = Buffer.alloc(5)
              header.writeUInt32BE(len, 0)
              header[4] = 20

              const extHandshakeMsg = Buffer.concat([
                header,
                Buffer.from([ut_metadata_value]),
                payloadBuf
              ])
              this.socket?.write(extHandshakeMsg)
            }
          } else if (parsed.result.subId === 1) {
            // Store each piece's raw bytes (from index 45 onward) in order
            const pieceIndex = decodedData?.decodedValue.piece
            const rawBytes = parsed.result.data.subarray(decodedData?.index)

            this.metadataPieces[pieceIndex] = rawBytes

            // Count the filtered slots in this.metadataPieces
            const receivedPieces = this.metadataPieces.filter((res) => res).length

            // If count equals this.totalpiececount - concatenate all buffers
            if (receivedPieces === this.totalPieceCount) {
              const fullBuffer = Buffer.concat(this.metadataPieces)

              // Compare SHA1 hash
              const hashedInfo = crypto.createHash('sha1').update(fullBuffer).digest()
              const match = this.checkInfoHash(this.magnetResults?.info_hash as Buffer, hashedInfo)
              if (match) {
                // bencode-decode the concatenated buffer - and emit
                const decodedDict = bencodeDecoder(fullBuffer, 0)
                this.emit('info_dictionary', decodedDict, fullBuffer)
              }
            }
          }
        }
      } else {
        break
      }
    }
  }
}
