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
  headerAssemblyResults: HeaderReturnType
): Promise<PeerReturnType[]> => {
  const { url, info_hash, peer_id, port, uploaded, downloaded, left, compact } =
    headerAssemblyResults;

  const info_hash_converted = bufferToHex(info_hash);
  const peer_id_converted = bufferToHex(peer_id);

  const assembledURL = `${url}?info_hash=${info_hash_converted}&peer_id=${peer_id_converted}&port=${port}&uploaded=${uploaded}&downloaded=${downloaded}&left=${left}&compact=${compact}`;

  try {
    const response = await fetch(assembledURL);
    console.log("STATUS:", response.status);
    const buffer = Buffer.from(await response.arrayBuffer());

    const decodedBuffer = decode(buffer, 0);

    if (decodedBuffer?.decodedValue?.["failure reason"]) {
      console.log("---FAILED---");
      console.log(
        decodedBuffer.decodedValue["failure reason"].toString("utf8")
      );
    }

    const peers = decodedBuffer?.decodedValue.peers;

    const peerInfo = [];
    // Loop through peers, 6 bytes at a time, first 4 are IP , last 2 are PORT
    // console.log("Got ", peers.length / 6, " peers");
    for (let i = 0; i < peers.length; i += 6) {
      const peer = peers.subarray(i, i + 6);
      const parsedPeer = parsePeer(peer);
      // console.log(
      //   `Peer ${peerInfo.length} is ip: ${parsedPeer.ip} port: ${parsedPeer.port}`
      // );
      peerInfo.push(parsedPeer);
    }

    return peerInfo;
  } catch (error) {
    console.error("Full error:", error);
    console.error("URL:", assembledURL);
    return [];
  }
};

const parsePeer = (peerBuffer: Buffer) => {
  const IP = peerBuffer.subarray(0, 4);
  const PORT = peerBuffer.subarray(4, 6);

  const stringIP = Array.from(IP).join(".");
  const stringPORT = PORT.readUInt16BE(0);

  return { ip: stringIP, port: stringPORT };
};
