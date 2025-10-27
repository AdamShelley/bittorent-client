export const encodeHandshake = (info_hash: Buffer, peer_id: Buffer) => {
  // Length of the protocol bytes
  const firstByte = Buffer.from([19]);
  // 19 bytes - For the string
  const bittorentProtocol = Buffer.from("BitTorrent protocol");
  // 8 reserved bytes
  const reserved = Buffer.alloc(8);

  const finalBuffer = Buffer.concat([
    firstByte,
    bittorentProtocol,
    reserved,
    info_hash,
    peer_id,
  ]);

  return finalBuffer;
};

export const decodeHandshake = (encoded: Buffer) => {
  const protocolLength = encoded[0];
  const protocol = encoded.subarray(1, 20).toString("utf8");
  const reserved = encoded.subarray(20, 28);
  const infoHash = encoded.subarray(28, 48);
  const peerId = encoded.subarray(48, 68);

  if (protocolLength !== 19) throw new Error("Protocol Length is incorrect");
  if (protocol !== "BitTorrent protocol")
    throw new Error("Protocol is incorrect");

  return {
    first_byte: protocolLength,
    bittorrentProtocol: protocol,
    reserved,
    info_hash: infoHash,
    peer_id: peerId,
  };
};

// Keep alive
export const encodeKeepAliveMessage = () => {
  return Buffer.from([0, 0, 0, 0]);
};

// 0 - choke
// 1 - unchoke
// 2 - interested
// 3 - not interested
const encodeSimpleMessage = (messageId: number) => {
  const buffer = Buffer.alloc(5);
  buffer.writeUInt32BE(1, 0);
  buffer[4] = messageId;
  return buffer;
};

export const encodeChoke = () => encodeSimpleMessage(0);
export const encodeUnchoke = () => encodeSimpleMessage(1);
export const encodeInterested = () => encodeSimpleMessage(2);
export const encodeNotInterested = () => encodeSimpleMessage(3);

// 4 - have

export const encodeHave = (pieceIndex: number) => {
  const buffer = Buffer.alloc(9);
  buffer.writeUInt32BE(5, 0);
  buffer[4] = 4;
  buffer.writeUInt32BE(pieceIndex, 5);

  return buffer;
};

// 5 - bitfield
export const encodeBitfield = (bitfield: Buffer) => {
  const buffer = Buffer.alloc(5);
  buffer.writeUInt32BE(1 + bitfield.length, 0);
  buffer[4] = 5;
  return Buffer.concat([buffer, bitfield]);
};

// 6 - request
export const encodeRequest = (
  pieceIndex: number,
  offset: number,
  length: number
) => {
  const buffer = Buffer.alloc(17);
  buffer.writeUInt32BE(13, 0);
  buffer[4] = 6;

  buffer.writeUInt32BE(pieceIndex, 5);
  buffer.writeUInt32BE(offset, 9);
  buffer.writeUInt32BE(length, 13);

  return buffer;
};

// 7 - piece
export const encodePiece = (index: number, begin: number, piece: Buffer) => {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(1 + 4 + 4 + piece.length, 0);
  buffer[4] = 7;

  buffer.writeUInt32BE(index, 5);
  buffer.writeUInt32BE(begin, 9);

  return Buffer.concat([buffer, piece]);
};

// 8 - cancel
export const encodeCancel = (
  index: number,
  begin: number,
  length: number
) => {};
