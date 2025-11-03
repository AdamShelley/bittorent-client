import crypto from "crypto";

interface DecodedValueType {
  announce?: Buffer;
  "announce-list"?: any[];
  info: {
    length?: number;
    files?: Array<{ length: number }>;
    [key: string]: any;
  };
  _rawInfo?: Buffer;
}

export interface HeaderReturnType {
  url: string;
  info_hash: Buffer;
  peer_id: Buffer;
  port: number;
  uploaded: number;
  downloaded: number;
  left: number;
  compact: number;
}

export const headerAssembly = (
  decodedValue: DecodedValueType,
  rawInfoBytes: Buffer
): HeaderReturnType => {
  // Handle both 'announce' and 'announce-list'
  let announceURL: Buffer;

  if (decodedValue.announce) {
    announceURL = decodedValue.announce;
  } else if (
    decodedValue["announce-list"] &&
    decodedValue["announce-list"].length > 0
  ) {
    // Get first HTTP/HTTPS tracker from announce-list
    const trackers = decodedValue["announce-list"];
    let httpTracker = null;

    for (const tier of trackers) {
      const tracker = Array.isArray(tier) ? tier[0] : tier;
      const trackerUrl = tracker.toString("utf8");

      // Skip UDP trackers since we don't support them yet
      if (
        trackerUrl.startsWith("http://") ||
        trackerUrl.startsWith("https://")
      ) {
        httpTracker = tracker;
        break;
      }
    }

    if (!httpTracker) {
      throw new Error("No HTTP/HTTPS tracker found in announce-list");
    }

    announceURL = httpTracker;
  } else {
    throw new Error("Torrent has no announce URL or announce-list");
  }

  if (!decodedValue.info) {
    throw new Error("Torrent file is missing 'info' dictionary");
  }

  // Handle both single-file and multi-file torrents
  let length: number;
  if (decodedValue.info.length !== undefined) {
    // Single-file torrent
    length = decodedValue.info.length;
  } else if (decodedValue.info.files) {
    // Multi-file torrent - sum all file lengths
    length = decodedValue.info.files.reduce(
      (sum: number, file: any) => sum + file.length,
      0
    );
  } else {
    throw new Error(
      "Torrent info dictionary missing both 'length' and 'files'"
    );
  }

  const hashedInfo = crypto.createHash("sha1").update(rawInfoBytes).digest();

  return {
    url: announceURL.toString("utf8"),
    info_hash: hashedInfo,
    peer_id: createPeerId(),
    port: 6881,
    uploaded: 0,
    downloaded: 0,
    left: length,
    compact: 1,
  };
};

const createPeerId = () => {
  const prefix = Buffer.from("-AS0001-");
  const random = crypto.randomBytes(12);
  return Buffer.concat([prefix, random]);
};
