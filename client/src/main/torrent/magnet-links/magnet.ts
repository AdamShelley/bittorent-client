import { HeaderReturnType } from '../header-assembly/headers'

export const handleMagnetLinks = async (url: string) => {
  // here

  const parseMagnetString = (magnet: string) => {
    const params = new URLSearchParams(magnet)
    const trackers = params.getAll('tr')
    const info_hash: string | undefined = params.get('xt')?.split(':')[2]

    console.log(trackers)
    console.log(info_hash)

    // convert the info_hash

    if (!info_hash) return

    let decodedBuffer: Buffer | null = null
    if (info_hash.length === 32) {
      // if base 32

      decodedBuffer = Buffer.from(info_hash, 'utf-8')
    } else if (info_hash.length === 40) {
      // if hexadecimal
      decodedBuffer = Buffer.from(info_hash, 'hex')
    } else {
      return console.log('Not sure what format')
    }

    if (!decodedBuffer) return

    console.log(decodedBuffer)
  }

  parseMagnetString(url.split('magnet:')[1])
}

handleMagnetLinks('magnet:?xt=urn:btih:HASH&tr=udp://tracker1.com&tr=udp://tracker2.com')
