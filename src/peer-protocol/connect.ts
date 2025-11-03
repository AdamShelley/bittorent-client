import type { PeerReturnType } from "../http-requests/contact-tracker";

import type { HeaderReturnType } from "../header-assembly/headers";
import { Coordinator } from "../coordinator/Coordinator";

export const connect = (
  peerList: PeerReturnType[],
  headerAssemblyResults: HeaderReturnType,
  decodedInfoSection: any
) => {
  new Coordinator(peerList, headerAssemblyResults, decodedInfoSection);
};
