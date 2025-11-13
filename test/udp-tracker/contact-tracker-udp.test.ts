import { expect, it, test } from "vitest";
import {
  handleUDPTrackers,
  parseUDPUrl,
} from "../../src/udp-tracker/contact-tracker-udp";

test("extracts url correctly", () => {
  const result = parseUDPUrl("udp://tracker.opentrackr.org:1337/announce");

  expect(result.hostname).toBe("tracker.opentrackr.org");
  expect(result.port).toBe("1337");
});
