import fs from 'fs'
import path from 'path'
import { decode } from '../bencode/bencode'
import { headerAssembly } from '../header-assembly/headers'
import { getPeerList } from '../http-requests/contact-tracker'
import { connect } from '../peer-protocol/connect'

export const downloadFile = async (torrentPath: string, downloadLocation: string) => {
  console.log('=== Download File Called ===')
  console.log('Torrent path:', torrentPath)
  console.log('Torrent path type:', typeof torrentPath)
  console.log('Download location:', downloadLocation)
  console.log('Download location type:', typeof downloadLocation)

  // Validate inputs
  if (!torrentPath || typeof torrentPath !== 'string') {
    throw new Error('Invalid torrent path: must be a non-empty string')
  }

  if (!downloadLocation || typeof downloadLocation !== 'string') {
    throw new Error('Invalid download location: must be a non-empty string')
  }

  // Resolve to absolute path if needed (though dialog should give absolute)
  const absoluteTorrentPath = path.resolve(torrentPath)
  console.log('Resolved torrent path:', absoluteTorrentPath)

  if (!fs.existsSync(absoluteTorrentPath)) {
    throw new Error(`File not found at path "${absoluteTorrentPath}"`)
  }

  let buffer: Buffer
  try {
    buffer = fs.readFileSync(absoluteTorrentPath)
    console.log('File read successfully, size:', buffer.length, 'bytes')
  } catch (err) {
    throw new Error(`Failed to read file "${absoluteTorrentPath}": ${(err as Error).message}`)
  }

  // DECODE FILE
  const searchString = '4:info'
  const position = buffer.indexOf(searchString)

  if (position === -1) {
    throw new Error('Invalid torrent file: missing info dictionary')
  }

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
  return connect(peerList, headerAssemblyResults, infoSection.decodedValue, downloadLocation)
}
