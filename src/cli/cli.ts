import fs from "fs";
import { decode } from "../bencode/bencode";

const torrentPath = process.argv[2];

if (!torrentPath) {
    console.error("Error: No torrent file path provided.\nUsage: node cli.js <torrent-file-path>");
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
    console.error(`Error: Failed to read file "${torrentPath}".\n${(err as Error).message}`);
    process.exit(1);
}
const decoded = decode(buffer, 0);
console.log(decoded);
console.log(decoded?.decodedValue.announce.toString("utf8"));
