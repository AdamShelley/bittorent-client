import crypto from "crypto";
import { encode } from "../bencode/bencode";

interface DecodedValueType {
  announce: Buffer;
  originalInfo: any;
  info: {
    length: number;
  };
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
  const announceURL = decodedValue.announce;
  const length = decodedValue.info.length;

  const hashedInfo = crypto.createHash("sha1").update(rawInfoBytes).digest();

  console.log(hashedInfo);

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
