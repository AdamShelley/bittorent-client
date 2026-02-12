import base32 from 'thirty-two'
import { HeaderReturnType } from '../header-assembly/headers'
import crypto from 'crypto'
import { PeerReturnType } from '../http-requests/contact-tracker'
import { MetadataPeer } from '../peer-protocol/metadata-peer'

export interface MagnetHeaderReturnType extends HeaderReturnType {
  trackers: string[]
}

export const handleMagnetLinks = async (url: string): Promise<MagnetHeaderReturnType | null> => {
  const parseMagnetString = (magnet: string): MagnetHeaderReturnType | null => {
    const params = new URLSearchParams(magnet)
    const trackers = params.getAll('tr')
    const length = params.get('xl') ?? 0
    const info_hash: string | undefined = params.get('xt')?.split(':')[2]

    // convert the info_hash

    if (!info_hash) return null

    let decodedBuffer: Buffer | null = null
    if (info_hash.length === 32) {
      // if base 32
      decodedBuffer = base32.decode(info_hash)
    } else if (info_hash.length === 40) {
      // if hexadecimal
      decodedBuffer = Buffer.from(info_hash, 'hex')
    } else {
      return null
    }

    if (!decodedBuffer) return null

    return {
      url: magnet,
      info_hash: decodedBuffer,
      trackers,
      peer_id: createPeerId(),
      port: 6881,
      uploaded: 0,
      downloaded: 0,
      left: length ? Number(length) : 0,
      compact: 1
    }
  }

  const result = parseMagnetString(url.split('magnet:')[1])
  return result
}

const createPeerId = (): Buffer => {
  const prefix = Buffer.from('-AS0001-')
  const random = crypto.randomBytes(12)
  return Buffer.concat([prefix, random])
}

export const requestMetadata = async (
  peerList: PeerReturnType[],
  magnetResults: MagnetHeaderReturnType
): Promise<void> => {
  // Try first few peers in parallel for metadata requests, attach listeners
  console.log('Total number of peers: ', peerList)
  peerList.slice(0, 40).map((peer) => {
    const m = new MetadataPeer(peer, magnetResults)

    m.on('error', (err) => {
      console.error('metadataPeer error:', err)
    })

    m.on('disconnected', () => {
      console.warn(`metadataPeer disconnected: ${peer.ip}:${peer.port}`)
    })

    return m
  })
}
