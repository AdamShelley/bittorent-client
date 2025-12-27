import { decode, encode } from "./bencode/bencode.js";

console.log("BitTorrent Client - Running in terminal");
console.log("=======================================\n");

// const result = decode("4:spam");
// const result = decode("l6:Coding10:Challenges4:cake5:happye", 0);
// const result = decode("li10e5:hello3:fooi-3ee", 0);
// const result = decode(
//   "d17:Coding Challengesd6:Rating7:Awesome8:website:20:codingchallenges.fyiee",
//   0
// );
// const result = encode(["test", 42]);
const result = encode({ name: "Alice", age: 30 });
const decodeResult = decode(result, 0);
console.log("Encoded:", result);
console.log("decoded", decodeResult);
