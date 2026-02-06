import base32 from 'thirty-two'

export const handleMagnetLinks = async (
  url: string
): Promise<{ info_hash_buffer: Buffer; trackers: string[] } | null> => {
  const parseMagnetString = (
    magnet: string
  ): { info_hash_buffer: Buffer; trackers: string[] } | null => {
    const params = new URLSearchParams(magnet)
    const trackers = params.getAll('tr')
    const info_hash: string | undefined = params.get('xt')?.split(':')[2]

    console.log(trackers)
    console.log(info_hash)

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

    console.log('decoded buffer', decodedBuffer)

    return {
      info_hash_buffer: decodedBuffer,
      trackers
    }
  }

  return parseMagnetString(url.split('magnet:')[1])
}

handleMagnetLinks(
  'magnet:?xt=urn:btih:554CC47F9DA3A45CF6A4D94802BC154358C27EE9&dn=Shaun+of+the+Dead+%282004%29+%281080p+Brrip+x265+HEVC+10bit+AAC+7.1%29&tr=http%3A%2F%2Fp4p.arenabg.com%3A1337%2Fannounce&tr=udp%3A%2F%2F47.ip-51-68-199.eu%3A6969%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2780%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2710%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2730%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2920%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Fopentracker.i2p.rocks%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.cyberia.is%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.dler.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Ftracker.pirateparty.gr%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.tiny-vps.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce'
)
