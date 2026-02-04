import dgram from 'dgram'
import type { HeaderReturnType } from '../header-assembly/headers'
import type { PeerReturnType } from '../http-requests/contact-tracker'

export const handleUDPTrackers = async (url: string, headerAssemblyResults: HeaderReturnType) => {
  // Extract hostname, port, announcepath
  const { hostname, port } = parseUDPUrl(url)

  const peers = await createUDPSocket(hostname, port, headerAssemblyResults)

  return peers as PeerReturnType[]
}

export const parseUDPUrl = (url: string) => {
  const match = url.match(/^udp:\/\/([^:\/\[\]]+|\[[^\]]+\]):?(\d+)?/)
  if (!match) throw new Error('Invalid UDP tracker URL')

  const hostname = match[1]
  const port = match[2] || '6969'

  return { hostname, port }
}

export const createUDPSocket = (
  hostname: string,
  port: string,
  headerAssemblyResults: HeaderReturnType
) => {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4')
    let connectTransactionId: number
    let announceTransactionId: number

    const buffer = Buffer.alloc(16)
    buffer.writeBigUInt64BE(4497486125440n, 0) // Correct protocol_id
    buffer.writeUInt32BE(0, 8) // action = connect
    connectTransactionId = Math.floor(Math.random() * 0xffffffff)
    buffer.writeUInt32BE(connectTransactionId, 12)

    // Send buffer
    socket.send(buffer, 0, 16, parseInt(port), hostname, (err) => {
      if (err) reject(err)
    })

    // Listen for response
    socket.on('message', (msg) => {
      // console.log("MESSAGE FROM UDP: ", msg);

      const action = msg.readUInt32BE(0)
      const responseTransactionId = msg.readUInt32BE(4)

      // console.log("Action:", action);
      // console.log("Transaction ID:", responseTransactionId);

      if (action === 0) {
        // ===== CONNECT RESPONSE =====
        if (responseTransactionId !== connectTransactionId) {
          throw new Error('Connect transaction ID mismatch')
        }

        const connectionId = msg.readBigUInt64BE(8)
        // console.log("Connection ID:", connectionId);

        // Build and send announce request
        announceTransactionId = Math.floor(Math.random() * 0xffffffff)

        const announceBuffer = Buffer.alloc(98)
        announceBuffer.writeBigUInt64BE(connectionId, 0)
        announceBuffer.writeUInt32BE(1, 8)
        announceBuffer.writeUInt32BE(announceTransactionId, 12)
        headerAssemblyResults.info_hash.copy(announceBuffer, 16)
        headerAssemblyResults.peer_id.copy(announceBuffer, 36)

        // Ensure values are non-negative and fit in 64-bit unsigned integers
        const downloaded =
          BigInt(headerAssemblyResults.downloaded) >= 0n
            ? BigInt(headerAssemblyResults.downloaded)
            : 0n
        const left =
          BigInt(headerAssemblyResults.left) >= 0n ? BigInt(headerAssemblyResults.left) : 0n
        const uploaded =
          BigInt(headerAssemblyResults.uploaded) >= 0n ? BigInt(headerAssemblyResults.uploaded) : 0n

        announceBuffer.writeBigUInt64BE(downloaded, 56)
        announceBuffer.writeBigUInt64BE(left, 64)
        announceBuffer.writeBigUInt64BE(uploaded, 72)
        announceBuffer.writeUInt32BE(2, 80)
        announceBuffer.writeUInt32BE(0, 84)
        const key = Math.floor(Math.random() * 0xffffffff)
        announceBuffer.writeUInt32BE(key, 88)
        announceBuffer.writeUInt32BE(50, 92)
        announceBuffer.writeUInt16BE(headerAssemblyResults.port, 96)

        socket.send(announceBuffer, 0, 98, parseInt(port), hostname, (err) => {
          if (err) {
            console.error('Announce send error:', err)
          }
        })
      } else if (action === 1) {
        // ===== ANNOUNCE RESPONSE =====
        if (responseTransactionId !== announceTransactionId) {
          throw new Error('Announce transaction ID mismatch')
        }

        // Parse announce response
        // const interval = msg.readUInt32BE(8);
        // const leechers = msg.readUInt32BE(12);
        // const seeders = msg.readUInt32BE(16);

        // console.log("Interval:", interval);
        // console.log("Leechers:", leechers);
        // console.log("Seeders:", seeders);

        // Parse peers (starts at byte 20)
        const peers = []
        for (let i = 20; i < msg.length; i += 6) {
          const peerBuffer = msg.subarray(i, i + 6)
          const ip = Array.from(peerBuffer.subarray(0, 4)).join('.')
          const port = peerBuffer.readUInt16BE(4)
          peers.push({ ip, port })
        }

        // console.log(`Got ${peers.length} peers from UDP tracker`);

        clearTimeout(timeout)
        socket.close()
        resolve(peers)
      }
    })

    // Timeout
    const timeout = setTimeout(() => {
      socket.close()
      reject(new Error('Timeout'))
    }, 5000)
  })
}
