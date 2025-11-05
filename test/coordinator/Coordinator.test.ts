import { test, expect } from "vitest";
import fs from "fs";
import path from "path";

test("readBlockFromFile reads correct bytes", async () => {
  // Create a test file
  const testFile = path.join(__dirname, "test.dat");
  const testData = Buffer.alloc(1024 * 1024); // 1MB
  testData.fill("A");
  fs.writeFileSync(testFile, testData);

  // Open it
  const fd = fs.openSync(testFile, "r");

  // Read a block
  const pieceLength = 262144; // 256KB
  const pieceIndex = 0;
  const offset = 16384;
  const length = 16384;

  const buffer = Buffer.alloc(length);
  const position = pieceIndex * pieceLength + offset;

  fs.readSync(fd, buffer, 0, length, position);

  expect(buffer.length).toBe(16384);
  expect(buffer[0]).toBe(65); // 'A'

  // Cleanup
  fs.closeSync(fd);
  fs.unlinkSync(testFile);
});
