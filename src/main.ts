import { decode } from "./bencode/bencode.js";

console.log("BitTorrent Client - Running in terminal");
console.log("=======================================\n");

// const result = decode("4:spam");
// const result = decode("l6:Coding10:Challenges4:cake5:happye", 0);
// const result = decode("li10e5:hello3:fooi-3ee", 0);
const result = decode(
  "d17:Coding Challengesd6:Rating7:Awesome8:website:20:codingchallenges.fyiee",
  0
);
console.log("Decoded:", result);
