import net from "net";
import type { PeerReturnType } from "../http-requests/contact-tracker";
import { decode, decodeHandshake, encodeHandshake } from "./peer-protocol";
import type { HeaderReturnType } from "../header-assembly/headers";

export const connect = (
  peerList: PeerReturnType[],
  headerAssemblyResults: HeaderReturnType
) => {
  const PEER_PORT = peerList[0].port;
  const PEER_IP = peerList[0].ip;
  let isHandshakeDone = false;

  const handshake = encodeHandshake(
    headerAssemblyResults.info_hash,
    headerAssemblyResults.peer_id
  );

  const socket = net.createConnection(PEER_PORT, PEER_IP, () => {
    console.log(`Connected to ${PEER_IP}:${PEER_PORT}`);
    socket.write(handshake);
    console.log("Handshake sent.");
  });

  socket.on("connect", () => {
    console.log("Connected");
  });

  socket.on("data", (data) => {
    if (!isHandshakeDone) {
      const res = decodeHandshake(data);
      console.log("🤝 Handshake received:", res);
      isHandshakeDone = true;
    } else {
      parseMessage(data);
    }
  });

  socket.on("error", (err) => {
    console.warn(err);
  });
};

function parseMessage(data: Buffer) {
  if (data.length < 4) return; // wait for full message
  const length = data.readUInt32BE(0);
  if (length === 0) {
    console.log("Keep-alive received");
    return;
  }
  const messageId = data.readUInt8(4);
  console.log(`Message ID: ${messageId}`);
}
