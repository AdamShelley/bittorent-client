import fs from 'fs'
import { decode } from '../bencode/bencode'
import { headerAssembly } from '../header-assembly/headers'
import { getPeerList } from '../http-requests/contact-tracker'
import { connect } from '../peer-protocol/connect'
import { DecodedTorrent } from '../../../types/types'
import { Coordinator } from '../coordinator/Coordinator'

export class StartTorrent {
  torrentPath: string | null = null
  downloadLocation: string | null = null
  torrent: DecodedTorrent | null = null
  coordinator: Coordinator | null = null
  private isPaused: boolean = false

  constructor(torrentPath: string, downloadLocation: string) {
    this.torrentPath = torrentPath
    this.downloadLocation = downloadLocation
  }

  async start(): Promise<void> {
    try {
      console.log('STARTING DOWNLOAD')
      if (!this.torrentPath) {
        console.error(
          'Error: No torrent file path provided.\nUsage: node cli.js <torrent-file-path>'
        )
        process.exit(1)
      }

      console.log('Torrent Path:', this.torrentPath)

      if (!fs.existsSync(this.torrentPath)) {
        console.error(`Error: File not found at path "${this.torrentPath}".`)
        process.exit(1)
      }

      let buffer: Buffer
      try {
        buffer = fs.readFileSync(this.torrentPath)
      } catch (err) {
        console.error(
          `Error: Failed to read file "${this.torrentPath}".\n${(err as Error).message}`
        )
        process.exit(1)
      }

      // DECODE FILE
      const searchString = '4:info'
      const position = buffer.indexOf(searchString)
      const infoStart = position + searchString.length
      const decoded = decode(buffer, 0)
      const infoSection = decode(buffer, infoStart)

      if (!decoded) throw new Error('Decoding failed')
      if (!infoSection) throw new Error('No info section')

      const infoEnd = infoSection.index
      const rawInfoBytes = buffer.subarray(infoStart, infoEnd)

      // ASSEMBLE HEADERS
      const headerAssemblyResults = headerAssembly(decoded.decodedValue, rawInfoBytes)

      if (!headerAssemblyResults) throw new Error('Assembling header failed')

      // GET PEER LIST, IDS, PORTS
      const peerList = await getPeerList(
        headerAssemblyResults,
        decoded.decodedValue['announce-list']
      )
      if (!peerList) throw new Error('Getting peer list failed')

      // Store torrent info for later access
      this.torrent = infoSection.decodedValue

      // Connect to peers, request pieces etc
      this.coordinator = connect(peerList, headerAssemblyResults, infoSection.decodedValue)
    } catch (e) {
      console.warn(e)
    }
  }

  getTorrentName(): string {
    return this.torrent?.name.toString() ?? 'Unknown'
  }

  getStatus(): 'downloading' | 'paused' | 'idle' {
    if (this.isPaused) return 'paused'
    if (!this.coordinator) return 'idle'
    return 'downloading'
  }

  getDownloadSpeed(): string {
    if (this.isPaused) return '0.00'
    const speedMBps = this.coordinator?.getDownloadSpeed() ?? 0
    return speedMBps.toFixed(2)
  }

  getTorrentPercent(): number {
    if (!this.isPaused) return 0
    const percent = this.coordinator?.getTorrentPercent() ?? 0
    return percent
  }

  pause(): void {
    this.isPaused = true
    this.coordinator?.pauseDownload()
  }

  async resumeTorrent(): Promise<void> {
    this.isPaused = false
    await this.coordinator?.resumeDownload()
  }
}
