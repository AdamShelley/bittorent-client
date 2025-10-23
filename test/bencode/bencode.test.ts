import { decode } from "../../src/bencode/bencode";

import { describe, it, expect } from "vitest";

describe("Bencode decoder", () => {
  it("decodes a simple string", () => {
    expect(decode("4:spam", 0)).toBe({ decodedValue: "spam", index: 5 });
  });

  it("decodes an integer", () => {
    expect(decode("i42e", 0)).toBe(42);
  });
});
