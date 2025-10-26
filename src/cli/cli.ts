import fs from "fs";
import { decode } from "../bencode/bencode";
import { headerAssesmbly } from "../header-assembly/headers";
import { getPeerList } from "../http-requests/contact-tracker";

const torrentPath = process.argv[2];

if (!torrentPath) {
  console.error(
    "Error: No torrent file path provided.\nUsage: node cli.js <torrent-file-path>"
  );
  process.exit(1);
}

if (!fs.existsSync(torrentPath)) {
  console.error(`Error: File not found at path "${torrentPath}".`);
  process.exit(1);
}

let buffer: Buffer;
try {
  buffer = fs.readFileSync(torrentPath);
} catch (err) {
  console.error(
    `Error: Failed to read file "${torrentPath}".\n${(err as Error).message}`
  );
  process.exit(1);
}

// DECODE FILE
const searchString = "4:info";
const position = buffer.indexOf(searchString);
const infoStart = position + searchString.length;

const decoded = decode(buffer, 0);
const infoSection = decode(buffer, infoStart);

if (!decoded) throw new Error("Decoding failed");
if (!infoSection) throw new Error("No info section");
const infoEnd = infoSection.index;
const rawInfoBytes = buffer.subarray(infoStart, infoEnd);

// ASSEMBLE HEADERS
const headerAssesmblyResults = headerAssesmbly(
  decoded.decodedValue,
  rawInfoBytes
);
if (!headerAssesmblyResults) throw new Error("Assembling header failed");

// GET PEER LIST, IDS, PORTS
const peerList = getPeerList(headerAssesmblyResults);
console.log(peerList);

// TODO: Build the encoder and deocer for the peer protocol
// TODO: Connect to all the peers, perform handshake, get bitfield - concurrently
// TODO: Create a way to track all pieces
// TODO: Download the pieces
// TODO: Assemble the file, save, shutdown client
// TODO: Bonus: Add support for seeding files, magnet URL, trackers, long running client to peer multiple files at a time
