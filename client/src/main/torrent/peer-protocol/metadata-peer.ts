import net from 'net'
import EventEmitter from 'events'
import { PeerReturnType } from '../http-requests/contact-tracker'
import { MagnetHeaderReturnType } from '../magnet-links/magnet'
import { Socket } from 'net'
import { decode, decodeHandshake, encodeHandshake } from './peer-protocol'
import { encode } from '../bencode/bencode'

export class MetadataPeer extends EventEmitter {
  peer: PeerReturnType | null = null
  magnetResults: MagnetHeaderReturnType | null = null
  socket: Socket | null = null
  PEER_PORT: number | null = null
  PEER_IP: string | null = null
  handshakeDone: boolean = false
  buffer: Buffer = Buffer.alloc(0)

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
      } catch (_) {}
      this.emit('disconnected')
    }, CONNECT_TIMEOUT)

    this.socket.once('connect', () => {
      clearTimeout(connectTimer)
      console.log(`Connected to ${this.PEER_IP}:${this.PEER_PORT}`)
      // send handshake now that socket is connected
      this.socket?.write(encodedHandshake)
    })

    this.socket.on('error', (err) => {
      console.error('MetadataPeer socket error:', err)
      try {
        this.socket?.destroy()
      } catch (_) {}
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
      } catch (_) {}
      this.emit('disconnected')
    })

    this.socket.on('data', (data) => this.handleData(data))
  }

  handleData = (data: Buffer): void => {
    if (!this.handshakeDone) {
      try {
        const res = decodeHandshake(data)
        console.log('🤝 Handshake received:', res)

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
          console.log('Message ID:', parsed?.id)

          if (parsed.id === 20) {
            // TODO:
            console.log('Ext worked')
          }
        } else {
          break
        }
      }
    }
  }

  checkInfoHash = (clientHash: Buffer, peerHash: Buffer): boolean => {
    return clientHash.equals(peerHash)
  }
}
