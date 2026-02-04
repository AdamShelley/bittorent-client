import fs from 'fs'
import { decode } from '../bencode/bencode'
import { headerAssembly } from '../header-assembly/headers'
import { getPeerList } from '../http-requests/contact-tracker'
import { connect } from '../peer-protocol/connect'

export class StartTorrent {
  torrentPath: string | null = null
  downloadLocation: string | null = null

  constructor(torrentPath: string, downloadLocation: string) {
    this.torrentPath = torrentPath
    this.downloadLocation = downloadLocation
  }

  async start() {
    console.log('STARTING DOWNLOAD')
    if (!this.torrentPath) {
      console.error('Error: No torrent file path provided.\nUsage: node cli.js <torrent-file-path>')
      process.exit(1)
    }

    if (!fs.existsSync(this.torrentPath)) {
      console.error(`Error: File not found at path "${this.torrentPath}".`)
      process.exit(1)
    }

    let buffer: Buffer
    try {
      buffer = fs.readFileSync(this.torrentPath)
    } catch (err) {
      console.error(`Error: Failed to read file "${this.torrentPath}".\n${(err as Error).message}`)
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
    const peerList = await getPeerList(headerAssemblyResults, decoded.decodedValue['announce-list'])
    if (!peerList) throw new Error('Getting peer list failed')

    // Connect to peers, request pieces etc
    connect(peerList, headerAssemblyResults, infoSection.decodedValue, this.downloadLocation)
  }
}
