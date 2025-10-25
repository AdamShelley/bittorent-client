import fs from "fs";
import { decode } from "../bencode/bencode";

const torrentPath = process.argv[2];
const buffer = fs.readFileSync(torrentPath);
const decoded = decode(buffer, 0);
console.log(decoded);
console.log(decoded?.decodedValue.announce.toString("utf8"));
