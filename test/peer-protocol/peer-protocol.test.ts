import { test, expect } from "vitest";
import crypto from "crypto";
import {
  decodeHandshake,
  encodeBitfield,
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
