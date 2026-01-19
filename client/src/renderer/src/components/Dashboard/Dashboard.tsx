import { useState } from 'react'

const Dashboard = (): React.JSX.Element => {
  const [torrentPath, setTorrentPath] = useState<string>('')

  const showDialog = async (): Promise<void> => {
    const result = await window.api.openFileDialog()

    if (result.canceled) return
    if (!result.filePath) return

    setTorrentPath(result.filePath)
    console.log(result)
    startDownload()
  }

  const startDownload = async (): Promise<void> => {
    const download = await window.api.startDownload(torrentPath)
    console.log(download)
  }

  return (
    <div>
      <button onClick={showDialog}>Open Torrent</button>
    </div>
  )
}

export default Dashboard
