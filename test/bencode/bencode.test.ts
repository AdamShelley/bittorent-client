import { decode } from "../../src/bencode/bencode";

import { describe, it, expect } from "vitest";

describe("Bencode decoder", () => {
  it("decodes a simple string", () => {
    expect(decode("4:spam", 0)).toEqual({ decodedValue: "spam", index: 5 });
  });

  it("decodes an integer", () => {
    expect(decode("i42e", 0)).toEqual({ decodedValue: 42, index: 3 });
  });

  it("decodes a list", () => {
    expect(decode("l6:Coding10:Challengese", 0)).toEqual({
      decodedValue: ["Coding", "Challenges"],
      index: 6,
    });
  });

  it("decodes a dictionary", () => {
    expect(
      decode(
        "d17:Coding Challengesd6:Rating7:Awesome8:website:20:codingchallenges.fyiee",
        0
      )
    ).toEqual({
      decodedValue: {
        "Coding Challenges": {
          "website:": "codingchallenges.fyi",
          Rating: "Awesome",
        },
      },
      index: 10,
    });
  });
});
