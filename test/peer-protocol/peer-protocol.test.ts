import { test, expect } from "vitest";
import crypto from "crypto";
import {
  decode,
  decodeBitfield,
  decodeCancel,
  decodeHandshake,
  decodeHave,
  decodePiece,
  decodeRequest,
  encodeBitfield,
  encodeCancel,
  encodeChoke,
  encodeHandshake,
  encodeHave,
  encodeKeepAliveMessage,
  encodePiece,
  encodeRequest,
  encodeUnchoke,
} from "../../src/peer-protocol/peer-protocol";

test("encodes handshake with correct length", () => {
  const infoHash = Buffer.alloc(20).fill(0);
  const peerId = Buffer.alloc(20).fill(1);

  const result = encodeHandshake(infoHash, peerId);

  expect(result.length).toBe(68);
});

test("first byte should be 19", () => {
  const infoHash = Buffer.alloc(20).fill(0);
  const peerId = Buffer.alloc(20).fill(1);

  const result = encodeHandshake(infoHash, peerId);

  expect(result[0]).toBe(19);
});

test('bytes 1-19 should contain "BitTorrent protocol"', () => {
  const infoHash = Buffer.alloc(20).fill(0);
  const peerId = Buffer.alloc(20).fill(1);

  const result = encodeHandshake(infoHash, peerId);

  const protocolString = result.subarray(1, 20).toString("utf8");
  expect(protocolString).toBe("BitTorrent protocol");
});

test("bytes 20-27 should contain reserved 0s", () => {
  const infoHash = Buffer.alloc(20).fill(0);
  const peerId = Buffer.alloc(20).fill(1);

  const result = encodeHandshake(infoHash, peerId);

  const reserved = result.subarray(20, 28);
  const expected = Buffer.alloc(8);
  expect(reserved.equals(expected)).toBe(true);
});

test("bytes 28-47 should be the info hash passed in ", () => {
  const infoHash = Buffer.alloc(20).fill(0);
  const peerId = Buffer.alloc(20).fill(1);

  const result = encodeHandshake(infoHash, peerId);

  const reserved = result.subarray(28, 48);
  expect(reserved.equals(infoHash)).toBe(true);
});

test("bytes 48-67 should be the peer id passed in ", () => {
  const infoHash = Buffer.alloc(20).fill(0);
  const peerId = Buffer.alloc(20).fill(1);

  const result = encodeHandshake(infoHash, peerId);

  const reserved = result.subarray(48, 68);
  expect(reserved.equals(peerId)).toBe(true);
});

// DECODING
test("decodes info_hash correctly", () => {
  const infoHash = crypto.randomBytes(20);
  const peerId = crypto.randomBytes(20);

  // Create a valid handshake buffer
  const handshakeBuffer = encodeHandshake(infoHash, peerId);

  // Decode it
  const decoded = decodeHandshake(handshakeBuffer);

  // Check info_hash matches
  expect(decoded.info_hash.equals(infoHash)).toBe(true);
});
test("decodes peer_id correctly", () => {
  const infoHash = crypto.randomBytes(20);
  const peerId = crypto.randomBytes(20);

  // Create a valid handshake buffer
  const handshakeBuffer = encodeHandshake(infoHash, peerId);

  // Decode it
  const decoded = decodeHandshake(handshakeBuffer);

  // Check info_hash matches
  expect(decoded.peer_id.equals(peerId)).toBe(true);
});

test("round-trip: encode then decode returns same values", () => {
  const infoHash = crypto.randomBytes(20);
  const peerId = crypto.randomBytes(20);

  const encoded = encodeHandshake(infoHash, peerId);
  const decoded = decodeHandshake(encoded);

  expect(decoded.info_hash.equals(infoHash)).toBe(true);
  expect(decoded.peer_id.equals(peerId)).toBe(true);
});

// KEEP-ALIVE
test("keep-alive is 4 bytes of zeros", () => {
  const result = encodeKeepAliveMessage();
  expect(result.length).toBe(4);
  expect(result.equals(Buffer.from([0, 0, 0, 0]))).toBe(true);
});

// Choke

test("encodes choke message correctly", () => {
  const result = encodeChoke();

  expect(result.length).toBe(5);
  expect(result.readUInt32BE(0)).toBe(1);
  expect(result[4]).toBe(0);
});

// Unchoke
test("encodes unchoke message correctly", () => {
  const result = encodeUnchoke();

  expect(result.length).toBe(5);
  expect(result.readUInt32BE(0)).toBe(1);
  expect(result[4]).toBe(1);
});

// Have
test("encodes have message correctly", () => {
  const pieceIndex = 42;
  const result = encodeHave(pieceIndex);

  expect(result.length).toBe(9);
  expect(result.readUInt32BE(0)).toBe(5);
  expect(result[4]).toBe(4); // message ID
  expect(result.readUInt32BE(5)).toBe(42); // piece index
});

test("encodes bitfield message correctly", () => {
  const bitfield = Buffer.from([0b10100100, 0b00000001]); // Has pieces 0, 2, 5, 15
  const result = encodeBitfield(bitfield);

  expect(result.length).toBe(7); // 4 (length) + 1 (id) + 2 (bitfield)
  expect(result.readUInt32BE(0)).toBe(3); // length = 1 + 2
  expect(result[4]).toBe(5); // message ID
  expect(result.subarray(5).equals(bitfield)).toBe(true); // bitfield data
});

test("encodes request message correctly", () => {
  const requestPiece = 5;
  const startByte = 16384;
  const requestBytes = 16384;

  const result = encodeRequest(requestPiece, startByte, requestBytes);

  expect(result.length).toBe(17);
  expect(result.readUInt32BE(0)).toBe(13);
  expect(result[4]).toBe(6);
  expect(result.readUInt32BE(5)).toBe(requestPiece);
  expect(result.readUInt32BE(9)).toBe(startByte);
  expect(result.readUInt32BE(13)).toBe(requestBytes);
});

test("encodes piece message correctly", () => {
  const pieceIndex = 0;
  const offset = 0;
  const block = Buffer.from("hello world");

  const result = encodePiece(pieceIndex, offset, block);

  expect(result.length).toBe(24);
  expect(result.readUInt32BE(0)).toBe(20);
  expect(result[4]).toBe(7);
  expect(result.readUInt32BE(5)).toBe(0);
  expect(result.readUInt32BE(9)).toBe(offset);
  expect(result.subarray(13).equals(block)).toBe(true);
});

test("encodes cancel message correctly", () => {
  const index = 0;
  const begin = 0;
  const length = 0;

  const result = encodeCancel(index, begin, length);

  expect(result.length).toBe(17);
  expect(result.readUInt32BE(0)).toBe(13);
  expect(result[4]).toBe(8);
  expect(result.readUInt32BE(5)).toBe(index);
  expect(result.readUInt32BE(9)).toBe(begin);
  expect(result.readUInt32BE(13)).toBe(length);
});

// DECODING
test("Have decodes correctly", () => {
  const encodedValue = encodeHave(45);

  const result = decodeHave(encodedValue);

  expect(result.pieceIndex).toBe(45);
});

test("decodes bitfield correctly", () => {
  const bitfield = Buffer.from([0b10100100, 0b00000001]);
  const encoded = encodeBitfield(bitfield);
  const decoded = decodeBitfield(encoded);

  expect(decoded.bitfield.equals(bitfield)).toBe(true);
});

test("decodes request correctly", () => {
  const requestPiece = 5;
  const startByte = 16384;
  const requestBytes = 16384;

  const encoded = encodeRequest(requestPiece, startByte, requestBytes);
  const decoded = decodeRequest(encoded);

  expect(decoded.requestPiece).equals(requestPiece);
  expect(decoded.startByte).equals(startByte);
  expect(decoded.requestBytes).equals(requestBytes);
});

test("Decodes piece correctly", () => {
  const pieceIndex = 3;
  const offset = 5;
  const block = Buffer.from("hello world");

  const encodedPiece = encodePiece(pieceIndex, offset, block);
  const result = decodePiece(encodedPiece);

  expect(result.pieceIndex).toBe(pieceIndex);
  expect(result.offset).toBe(offset);
  expect(result.block.equals(block)).toBe(true);
});

test("Decodes cancel correctly", () => {
  const index = 5;
  const begin = 100;
  const length = 1000;

  const encoded = encodeCancel(index, begin, length);

  const result = decodeCancel(encoded);

  expect(result.requestPiece).toBe(index);
  expect(result.startByte).toBe(begin);
  expect(result.requestBytes).toBe(length);
});

// test("decode manager works", () => {
//   const bitfield = Buffer.from([0b10100100, 0b00000001]);
//   const encoded = encodeBitfield(bitfield);
//   const decoded = decode(encoded);

//   expect(
//     "bitfield" in decoded &&
//       Buffer.isBuffer(decoded.bitfield) &&
//       decoded.bitfield.equals(bitfield)
//   ).toBe(true);
// });
