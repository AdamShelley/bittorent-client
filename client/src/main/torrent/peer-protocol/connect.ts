import type { PeerReturnType } from '../http-requests/contact-tracker'
import type { HeaderReturnType } from '../header-assembly/headers'
import { Coordinator } from '../coordinator/Coordinator'
import { DecodedTorrent } from '../../../types/types'

export const connect = (
  peerList: PeerReturnType[],
  headerAssemblyResults: HeaderReturnType,
  decodedInfoSection: DecodedTorrent,
  downloadLocation: string,
  customFolderName?: string
): Coordinator => {
  return new Coordinator(peerList, headerAssemblyResults, decodedInfoSection, downloadLocation, customFolderName)
}
