import { decode } from "./bencode/bencode.js";

console.log("BitTorrent Client - Running in terminal");
console.log("=======================================\n");

// const result = decode("4:spam");
const result = decode("i42e", 0);
console.log("Decoded:", result);
