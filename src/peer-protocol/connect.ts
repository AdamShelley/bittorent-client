import type { PeerReturnType } from "../http-requests/contact-tracker";

import type { HeaderReturnType } from "../header-assembly/headers";
import { Peer } from "./peer";

export const connect = (
  peerList: PeerReturnType[],
  headerAssemblyResults: HeaderReturnType
) => {
  const peers = peerList.forEach((peer, index) =>
    index <= 5 ? new Peer(peer, headerAssemblyResults) : null
  );
};
