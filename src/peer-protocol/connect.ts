import type { PeerReturnType } from "../http-requests/contact-tracker";

import type { HeaderReturnType } from "../header-assembly/headers";
import { Peer } from "./peer";

export const connect = (
  peerList: PeerReturnType[],
  headerAssemblyResults: HeaderReturnType
) => {
  // TODO: Loop through all peers - testing on one for now
  const peer = new Peer(peerList[0], headerAssemblyResults);

  const peers = peerList.forEach((peer, index) =>
    index <= 5 ? new Peer(peer, headerAssemblyResults) : null
  );
};

//TODO:
// Separate Message handler
// State management
