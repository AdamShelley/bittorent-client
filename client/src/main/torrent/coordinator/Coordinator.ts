import type { HeaderReturnType } from '../header-assembly/headers'
import { getPeerList, type PeerReturnType } from '../http-requests/contact-tracker'
import { Peer } from '../peer-protocol/peer'
import { PieceManager } from '../piece-manager/Piece-Manager'
import { SETTINGS } from '../settings/settings'
import { FileManager } from '../file-manager/File-Manager'
import { DecodedTorrent } from '../../../types/types'

export class Coordinator {
  pieceManager: PieceManager
  fileManager: FileManager

  torrent: DecodedTorrent
  peerList: PeerReturnType[] | null = null
  headers: HeaderReturnType | null = null
  totalPieces: number = 0
  pieceLength: number = 16
  totalFileSize: number = 0
  infoHash: Buffer | null = null
  bytesDownloaded: number = 0
  downloadStartTime: number = 0
  lastProgressLog: number = 0
  peers: Peer[] = []
  trackerInterval: number = 1800
  interestedPeers: Set<Peer> = new Set()
  unchokedPeers: Set<Peer> = new Set()
  isPaused = false
  isComplete = false
  private unchokeTimer?: NodeJS.Timeout
  private trackerTimer?: NodeJS.Timeout
  private onCompleteCallback?: (name: string) => void

  // Speed tracking with rolling average
  private lastSpeedCheck: number = 0
  private bytesAtLastCheck: number = 0
  private currentSpeed: number = 0
  private speedSamples: number[] = []
  private readonly SPEED_SAMPLE_COUNT = 5

  private downloadLocation: string
  private customFolderName?: string

  constructor(
    peerList: PeerReturnType[],
    headerAssemblyResults: HeaderReturnType,
    torrentInfo: DecodedTorrent,
    downloadLocation: string,
    customFolderName?: string
  ) {
    this.peerList = peerList
    this.headers = headerAssemblyResults
    this.torrent = torrentInfo
    this.downloadLocation = downloadLocation
    this.customFolderName = customFolderName
    // Handle both single-file and multi-file torrents
    if (torrentInfo.length) {
      this.totalFileSize = torrentInfo.length
    } else if (torrentInfo.files) {
      this.totalFileSize = torrentInfo.files.reduce(
        (sum: number, file: { length: number }) => sum + file.length,
        0
      )
    } else {
      this.totalFileSize = 0
    }
    console.log(
      'Total file size calculated:',
      this.totalFileSize,
      'Single file length:',
      torrentInfo.length,
      'Has files array:',
      !!torrentInfo.files
    )
    this.pieceLength = torrentInfo['piece length']
    this.totalPieces = torrentInfo.pieces.length / 20

    console.log('TORRENTINFO:', torrentInfo)

    this.pieceManager = new PieceManager(
      this.totalPieces,
      this.pieceLength,
      this.totalFileSize,
      this.torrent.pieces
    )

    this.fileManager = new FileManager(torrentInfo, this.downloadLocation, this.customFolderName)

    const completed = this.fileManager.getResumeJsonFile()

    completed?.forEach((pieceIndex: number) => this.pieceManager.markPieceComplete(pieceIndex))

    this.startPeerConnection()
    this.unchokeRotation()

    this.unchokeTimer = setInterval(() => {
      if (!this.isPaused) this.unchokeRotation()
    }, 30_000)

    this.scheduleTrackerAnnounce()
    this.setupGracefulShutdown()
  }

  startPeerConnection = (): void => {
    if (!this.peerList || !this.peerList.length || !this.headers) return

    // Connect to up to 50 peers
    const peersToConnect = this.peerList.slice(0, 250)

    peersToConnect.forEach((peer) =>
      this.peers.push(
        new Peer(peer, this.headers!, this.pieceManager.completedPieces, this.totalPieces)
      )
    )
    console.log(`Connecting to ${this.peers.length} peers...`)
    this.peers.forEach((peer: Peer) => this.attachListeners(peer))
  }

  attachListeners(peer: Peer): void {
    peer.on('unchoke', () => this.onPeerUnchoked(peer))
    peer.on('piece', (pieceData) => this.onPeerReceivePiece(peer, pieceData))
    peer.on('disconnected', () => this.onPeerDisconnected(peer))
    peer.on('request', (pieceData) => this.peerRequestPiece(peer, pieceData))
    peer.on('interested', () => this.onPeerInterested(peer))
    peer.on('have', (pieceIndex) => {
      this.pieceManager.incrementPieceAvailability(pieceIndex)
    })
    peer.on('bitfield-received', (bitfieldData) => this.onPeerBitfieldReceived(peer, bitfieldData))
    peer.on('not-interested', () => this.onPeerNotInterested(peer))
  }

  pauseDownload(): void {
    if (this.isPaused) return
    this.isPaused = true

    console.log('⏸ Pausing torrent...')
    this.stopTimers()

    this.peers.forEach((peer) => peer.pause())

    this.peers = []
    this.interestedPeers.clear()
    this.unchokedPeers.clear()

    this.fileManager.writeToResume(this.pieceManager.getCompletedPieces(), false)
  }

  resumeDownload(): void {
    if (!this.isPaused) return
    this.isPaused = false

    console.log('▶ Resuming torrent...')
    this.startPeerConnection()
    this.unchokeRotation()
    this.startTimers()

    // If in endgame mode, trigger endgame requests after peers have time to connect
    if (this.pieceManager.isEndgameMode) {
      setTimeout(() => {
        if (!this.isPaused && !this.isComplete) {
          console.log('🏁 Resuming in endgame mode - requesting remaining pieces')
          this.triggerEndgameRequests()
        }
      }, 3000) // Give peers 3 seconds to handshake
    }

    // Also fetch fresh peers from tracker
    this.fetchFreshPeers()
  }

  private async fetchFreshPeers(): Promise<void> {
    if (!this.headers) return

    try {
      const newPeers = await getPeerList(
        {
          ...this.headers,
          ...this.getAnnounceStats()
        },
        this.torrent['announce-list']
      )

      const existingIPs = new Set(this.peers.map((p) => `${p.PEER_IP}:${p.PEER_PORT}`))
      const freshPeers = newPeers.filter((peer) => !existingIPs.has(`${peer.ip}:${peer.port}`))

      if (freshPeers.length > 0) {
        console.log(`Found ${freshPeers.length} fresh peers`)
        freshPeers.slice(0, 50).forEach((peer) => {
          const newPeer = new Peer(
            peer,
            this.headers!,
            this.pieceManager.completedPieces,
            this.totalPieces
          )
          this.attachListeners(newPeer)
          this.peers.push(newPeer)
        })
      }
    } catch (e) {
      console.error('Failed to fetch fresh peers:', e)
    }
  }

  getAnnounceStats(): { uploaded: number; downloaded: number; left: number } {
    const lastPieceSize = this.totalFileSize % this.pieceLength || this.pieceLength

    // For the last piece, use actual file size instead of piece length
    let actualCompletedBytes = 0
    if (this.pieceManager.getCompletedCount() > 0) {
      const fullPieces = Math.min(this.pieceManager.getCompletedCount(), this.totalPieces - 1)
      actualCompletedBytes = fullPieces * this.pieceLength

      // Add last piece if it's completed
      if (this.pieceManager.completedPieces.has(this.totalPieces - 1)) {
        actualCompletedBytes += lastPieceSize
      }
    }

    const left = Math.max(0, this.totalFileSize - actualCompletedBytes)

    return {
      uploaded: 0,
      downloaded: this.bytesDownloaded,
      left
    }
  }

  getDownloadSpeed(): number {
    const now = Date.now()
    const elapsed = now - this.lastSpeedCheck

    // Update speed every 1 second
    if (elapsed >= 1000) {
      const bytesDiff = this.bytesDownloaded - this.bytesAtLastCheck
      const instantSpeed = ((bytesDiff / elapsed) * 1000) / (1024 * 1024) // MB/s

      // Add to rolling samples
      this.speedSamples.push(instantSpeed)
      if (this.speedSamples.length > this.SPEED_SAMPLE_COUNT) {
        this.speedSamples.shift()
      }

      // Calculate average of samples
      this.currentSpeed = this.speedSamples.reduce((a, b) => a + b, 0) / this.speedSamples.length

      this.lastSpeedCheck = now
      this.bytesAtLastCheck = this.bytesDownloaded
    } else if (elapsed > 3000 && this.currentSpeed > 0) {
      // If no update for 3+ seconds, speed is likely stalled - decay it
      this.currentSpeed = this.currentSpeed * 0.5
      this.speedSamples = [this.currentSpeed]
    }

    return this.currentSpeed
  }

  getTorrentPercent(): number {
    const progress = (this.pieceManager.getCompletedCount() / this.totalPieces) * 100
    return progress
  }

  getBytesDownloaded(): number {
    // Calculate from completed pieces to persist across restarts
    const completedCount = this.pieceManager.getCompletedCount()
    if (completedCount === 0) return 0

    // All pieces except the last one are full-sized
    const lastPieceIndex = this.totalPieces - 1
    const lastPieceSize = this.totalFileSize % this.pieceLength || this.pieceLength

    // Check if last piece is completed
    const hasLastPiece = this.pieceManager.completedPieces.has(lastPieceIndex)
    const fullPieces = hasLastPiece ? completedCount - 1 : completedCount

    let downloadedBytes = fullPieces * this.pieceLength
    if (hasLastPiece) {
      downloadedBytes += lastPieceSize
    }

    return downloadedBytes
  }

  getTotalFileSize(): number {
    return this.totalFileSize
  }

  getOutputFolder(): string | null {
    return this.fileManager.getOutputFolder()
  }

  onComplete(callback: (name: string) => void): void {
    this.onCompleteCallback = callback
  }

  detatchListeners(peer: Peer): void {
    console.log('Pausing:', peer)
    peer.pause()
  }

  onPeerUnchoked = (peer: Peer): void => {
    // Find a piece that's needed AND not in-progress AND the peer has
    if (this.isComplete) return
    return this.assignPieceToDownload(peer)
  }

  onPeerBitfieldReceived = (_peer: Peer, bitfieldData: Buffer): void => {
    this.pieceManager.updateAvailability(bitfieldData, true)
  }

  onPeerInterested = (peer: Peer): void => {
    console.log(`> Peer ${peer.PEER_IP} is interested in our pieces`)

    this.interestedPeers?.add(peer)
  }

  onPeerNotInterested = (peer: Peer): void => {
    this.interestedPeers?.delete(peer)
  }

  onPeerReceivePiece = (
    peer: Peer,
    pieceData: { pieceIndex: number; offset: number; block: Buffer }
  ): void => {
    // Don't process pieces if download is complete or paused
    if (this.isComplete || this.isPaused) return

    if (this.downloadStartTime === 0) {
      this.downloadStartTime = Date.now()
    }
    this.bytesDownloaded += pieceData.block.length

    const result = this.pieceManager.onBlockReceived(
      pieceData.pieceIndex,
      pieceData.offset,
      pieceData.block
    )

    if (result.status === 'incomplete') {
      const actualPieceSize =
        pieceData.pieceIndex === this.totalPieces - 1
          ? this.totalFileSize - pieceData.pieceIndex * this.pieceLength
          : this.pieceLength

      const expectedBlocks = Math.ceil(actualPieceSize / SETTINGS.BLOCK_SIZE)

      // Calculate which blocks we've already requested
      const alreadyRequested = new Set<number>()
      peer.requestQueue.forEach((req) => {
        if (req.pieceIndex === pieceData.pieceIndex) {
          alreadyRequested.add(req.offset)
        }
      })
      peer.pendingRequests.forEach((req) => {
        if (req.pieceIndex === pieceData.pieceIndex) {
          alreadyRequested.add(req.offset)
        }
      })

      // Request next blocks to keep pipeline full (request up to 5 more blocks)
      let blocksRequested = 0
      for (let i = 0; i < expectedBlocks && blocksRequested < 5; i++) {
        const blockOffset = i * SETTINGS.BLOCK_SIZE

        if (!alreadyRequested.has(blockOffset) && blockOffset < actualPieceSize) {
          const blockSize = Math.min(SETTINGS.BLOCK_SIZE, actualPieceSize - blockOffset)
          peer.requestPiece(pieceData.pieceIndex, blockOffset, blockSize)
          blocksRequested++
        }
      }
    }

    if (result.status === 'failed') {
      this.assignPieceToDownload(peer)
    }

    if (result.status === 'complete') {
      this.fileManager.writePieceToFile(result, pieceData, this.pieceLength)

      // If endgame mode:
      if (Array.isArray(result.peersToCancel)) {
        result.peersToCancel.forEach((p) => {
          if (p !== peer) {
            p.cancelPiece(pieceData.pieceIndex)
          }
        })
      }

      this.peers.forEach((peer) => {
        peer.sendHave(pieceData.pieceIndex)
      })

      // Download logging - use the same speed calculation as getDownloadSpeed()
      const activePeers = this.peers.filter((p) => !p.peerChoking).length
      const speedMBps = this.getDownloadSpeed()
      const progress = ((this.pieceManager.getCompletedCount() / this.totalPieces) * 100).toFixed(1)

      console.log(
        `Progress: ${this.pieceManager.getCompletedCount()}/${
          this.totalPieces
        } (${progress}%) | Speed: ${speedMBps.toFixed(2)} MB/s | Active: ${activePeers} peers`
      )

      this.fileManager.writeToResume(this.pieceManager.getCompletedPieces(), false)

      if (this.pieceManager.getPiecesNeededCount() <= 20 && !this.pieceManager.isEndgameMode) {
        this.pieceManager.setEndgameMode(true)
        console.log('🏁 Entering endgame mode - requesting remaining pieces from all peers')
        // Request all remaining pieces from all unchoked peers
        this.triggerEndgameRequests()
      }

      if (this.pieceManager.getCompletedCount() === this.totalPieces) {
        // Mark as complete first to stop processing new pieces
        this.isComplete = true

        // Stop all timers
        // this.stopTimers()

        // // Disconnect all peers to stop incoming data
        // this.peers.forEach((peer) => peer.pause())
        // this.peers = []

        // Save resume state and close file
        this.fileManager.writeToResume(this.pieceManager.getCompletedPieces(), true)
        // this.fileManager.closeFile()
        console.log('*** Download complete!', this.fileManager.getOutputPath())

        // Notify completion
        if (this.onCompleteCallback) {
          const torrentName = this.torrent.name.toString()
          this.onCompleteCallback(torrentName)
        }
        return
      }

      // Get next piece
      this.assignPieceToDownload(peer)
    }
  }

  assignPieceToDownload = (peer: Peer): void => {
    if (this.isComplete || this.isPaused) return

    const pieceIndex = this.pieceManager.getPieceToDownload(peer)
    if (pieceIndex == null) return

    const blocks = this.pieceManager.getPieceBlocks(pieceIndex)
    blocks?.forEach((block) => {
      peer.requestPiece(pieceIndex, block.offset, block.length)
    })

    this.pieceManager.trackPeerAssignment(pieceIndex, peer)
  }

  triggerEndgameRequests = (): void => {
    // Get all unchoked peers
    const unchokedPeers = this.peers.filter((p) => !p.peerChoking && p.handshakeDone)

    // Get remaining pieces needed
    const piecesNeeded = Array.from(this.pieceManager.piecesNeeded)

    // Request each remaining piece from every peer that has it
    for (const pieceIndex of piecesNeeded) {
      const blocks = this.pieceManager.getPieceBlocks(pieceIndex)

      for (const peer of unchokedPeers) {
        if (peer.hasPiece(pieceIndex)) {
          blocks?.forEach((block) => {
            peer.requestPiece(pieceIndex, block.offset, block.length)
          })
          this.pieceManager.trackPeerAssignment(pieceIndex, peer)
        }
      }
    }
  }

  onPeerDisconnected = async (peer: Peer): Promise<void> => {
    // Remove from active peers
    this.peers = this.peers.filter((p) => p !== peer)
    this.interestedPeers.delete(peer)
    this.unchokedPeers.delete(peer)

    // If we have fewer than 20 active peers, try to get more
    const activePeers = this.peers.filter((p) => p.handshakeDone).length
    this.pieceManager.updateAvailability(peer.bitfield, false)

    if (activePeers < 50) {
      if (!this.headers) return

      const newPeers = await getPeerList(
        {
          ...this.headers!,
          ...this.getAnnounceStats()
        },
        this.torrent['announce-list']
      )

      const existingIPs = new Set(this.peers.map((p) => `${p.PEER_IP}:${p.PEER_PORT}`))

      newPeers
        .filter((p) => !existingIPs.has(`${p.ip}:${p.port}`))
        .slice(0, 20)
        .forEach((peerInfo) => {
          const newPeer = new Peer(
            peerInfo,
            this.headers!,
            this.pieceManager.completedPieces,
            this.totalPieces
          )
          this.attachListeners(newPeer)
          this.peers.push(newPeer)
        })
    }
  }

  scheduleTrackerAnnounce = (): void => {
    this.trackerTimer = setInterval(async () => {
      if (this.isPaused) return
      if (!this.headers) return

      const newPeers = await getPeerList(
        {
          ...this.headers!,
          ...this.getAnnounceStats()
        },
        this.torrent['announce-list']
      )

      // Add peers we don't already have
      const existingIPs = new Set(this.peers.map((p) => `${p.PEER_IP}:${p.PEER_PORT}`))
      const freshPeers = newPeers.filter((peer) => !existingIPs.has(`${peer.ip}:${peer.port}`))

      if (freshPeers.length > 0) {
        freshPeers.slice(0, SETTINGS.MAX_FRESH_PEERS_PER_ANNOUNCE).forEach((peer) => {
          const newPeer = new Peer(
            peer,
            this.headers!,
            this.pieceManager.completedPieces,
            this.totalPieces
          )
          this.attachListeners(newPeer)
          this.peers.push(newPeer)
        })
      }
    }, this.trackerInterval * 1000)
  }

  peerRequestPiece = (
    peer: Peer,
    requestPiece: { pieceIndex: number; offset: number; length: number }
  ): void => {
    // Read the block from your file
    if (!this.pieceManager.completedPieces.has(requestPiece.pieceIndex)) {
      return
    }

    if (!this.fileManager.getOutputFile()) return

    const buffer = Buffer.alloc(requestPiece.length)
    const position = requestPiece.pieceIndex * this.pieceLength + requestPiece.offset

    console.log('Peer requested a piece, reading filemanager')

    this.fileManager.readFilePiece(buffer, requestPiece, position, peer)
  }

  unchokeRotation = (): void => {
    const interestedPeersArray = Array.from(this.interestedPeers)
    for (let i = 0; i < interestedPeersArray.length; i++) {
      const peer = interestedPeersArray[i]
      if (peer.amChoking) {
        peer.encodeUnchokeHelper()
        this.unchokedPeers.add(peer)
        if (this.unchokedPeers.size >= SETTINGS.MAX_UNCHOKED_PEERS) {
          return
        }
      }
    }
  }

  setupGracefulShutdown(): void {
    const shutdown = (): void => {
      console.log('\nSaving final resume state...')
      this.fileManager.writeToResume(this.pieceManager.getCompletedPieces(), true)
      this.fileManager.closeFile()
      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  }

  startTimers(): void {
    this.unchokeTimer = setInterval(() => {
      if (!this.isPaused) this.unchokeRotation()
    }, 30_000)

    this.scheduleTrackerAnnounce()
  }

  stopTimers(): void {
    if (this.unchokeTimer) clearInterval(this.unchokeTimer)
    if (this.trackerTimer) clearInterval(this.trackerTimer)

    this.unchokeTimer = undefined
    this.trackerTimer = undefined
  }
}

// TODO:
// after download check all files against hash?
// Magnet link support
// DHT (Distributed Hash Table)
