import net from 'net'
import EventEmitter from 'events'
import { PeerReturnType } from '../http-requests/contact-tracker'
import { MagnetHeaderReturnType } from '../magnet-links/magnet'
import { Socket } from 'net'

export class MetadataPeer extends EventEmitter {
  peer: PeerReturnType | null = null
  magnetResults: MagnetHeaderReturnType | null = null
  socket: Socket | null = null
  PEER_PORT: number | null = null
  PEER_IP: string | null = null

  constructor(peer: PeerReturnType, magnetResults: MagnetHeaderReturnType) {
    super()
    this.peer = peer
    this.magnetResults = magnetResults
    this.PEER_PORT = peer.port
    this.PEER_IP = peer.ip

    this.getMetadata()
  }

  getMetadata(): void {
    if (!this.PEER_PORT || !this.PEER_IP) return
    // Create the socket
    // Connect to the peer

    this.socket = net.createConnection(this.PEER_PORT, this.PEER_IP, () => {
      console.log(`Connected to ${this.PEER_IP}:${this.PEER_PORT}`)
      // Formulate the request
      // GEt the handshake
      // Capture the data
    })
  }
}
