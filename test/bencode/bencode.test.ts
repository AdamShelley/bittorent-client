const { decode } = require("../../src/bencode/bencode");

import { describe, it, expect } from "vitest";

describe("Bencode decoder", () => {
  it("decodes a simple string", () => {
    expect(decode("4:spam")).toBe("spam");
  });

  it("decodes an integer", () => {
    expect(decode("i42e")).toBe(42);
  });
});
