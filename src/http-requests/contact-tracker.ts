import { decode } from "../bencode/bencode";
import type { HeaderReturnType } from "../header-assembly/headers";

export interface PeerReturnType {
  ip: string;
  port: number;
}

const bufferToHex = (buffer: Buffer) => {
  return [...new Uint8Array(buffer)]
    .map((x) => "%" + x.toString(16).padStart(2, "0"))
    .join("");
};

export const getPeerList = async (
  headerAssemblyResults: HeaderReturnType,
  announceList?: any[]
): Promise<PeerReturnType[]> => {
  const { url, info_hash, peer_id, port, uploaded, downloaded, left, compact } =
    headerAssemblyResults;

  const info_hash_converted = bufferToHex(info_hash);
  const peer_id_converted = bufferToHex(peer_id);

  // Build list of trackers to try
  const trackersToTry = [url];

  if (announceList) {
    for (const tier of announceList) {
      const tracker = Array.isArray(tier) ? tier[0] : tier;
      const trackerUrl = tracker.toString("utf8");

      // Only add HTTP/HTTPS trackers
      if (
        (trackerUrl.startsWith("http://") ||
          trackerUrl.startsWith("https://")) &&
        trackerUrl !== url
      ) {
        trackersToTry.push(trackerUrl);
      } else {
        console.log("Tracker is UDP");
      }
    }
  }

  console.log(`Trying ${trackersToTry.length} tracker(s)...`);

  // Try each tracker until one works
  for (const trackerUrl of trackersToTry) {
    const assembledURL = `${trackerUrl}?info_hash=${info_hash_converted}&peer_id=${peer_id_converted}&port=${port}&uploaded=${uploaded}&downloaded=${downloaded}&left=${left}&compact=${compact}&numwant=50`;

    try {
      // console.log(`📡 Trying tracker: ${trackerUrl}`);
      const response = await fetch(assembledURL);
      // console.log("STATUS:", response.status);

      if (response.status === 503) {
        console.log("⚠️  Tracker rate-limiting, trying next...");
        continue;
      }

      if (!response.ok) {
        console.log(`❌ Tracker error ${response.status}, trying next...`);
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const decodedBuffer = decode(buffer, 0);

      if (decodedBuffer?.decodedValue?.["failure reason"]) {
        console.log("---FAILED---");
        console.log(
          "REASON:",
          decodedBuffer.decodedValue["failure reason"].toString("utf8")
        );
        continue;
      }

      const peers = decodedBuffer?.decodedValue.peers;

      if (!peers || peers.length === 0) {
        console.log("⚠️  Tracker returned no peers, trying next...");
        continue;
      }

      const peerInfo = [];
      for (let i = 0; i < peers.length; i += 6) {
        const peer = peers.subarray(i, i + 6);
        const parsedPeer = parsePeer(peer);
        peerInfo.push(parsedPeer);
      }

      console.log(`✅ Got ${peerInfo.length} peers from ${trackerUrl}`);
      return peerInfo;
    } catch (error) {
      console.log(`❌ Tracker ${trackerUrl} failed:`, (error as Error).message);
      continue;
    }
  }

  console.error("❌ All trackers failed");
  return [];
};

const parsePeer = (peerBuffer: Buffer) => {
  const IP = peerBuffer.subarray(0, 4);
  const PORT = peerBuffer.subarray(4, 6);

  const stringIP = Array.from(IP).join(".");
  const stringPORT = PORT.readUInt16BE(0);

  return { ip: stringIP, port: stringPORT };
};
