import type { PeerReturnType } from '../http-requests/contact-tracker'
import type { HeaderReturnType } from '../header-assembly/headers'
import { Coordinator } from '../coordinator/Coordinator'
import { ProgressManager } from '../Progress/Progress'

export const connect = (
  peerList: PeerReturnType[],
  headerAssemblyResults: HeaderReturnType,
  decodedInfoSection: any,
  downloadLocation: string
) => {
  const coordinator = new Coordinator(
    peerList,
    headerAssemblyResults,
    decodedInfoSection,
    downloadLocation
  )

  return new ProgressManager(coordinator)
}
