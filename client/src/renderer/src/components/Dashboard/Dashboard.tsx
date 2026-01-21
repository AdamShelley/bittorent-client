const Dashboard = (): React.JSX.Element => {
  const showDialog = async (): Promise<void> => {
    const result = await window.api.openFileDialog()

    if (result.canceled) return
    if (!result.filePath) return

    console.log(result)
    await startDownload(result.filePath)
  }

  const startDownload = async (torrentPath: string): Promise<void> => {
    const download = await window.api.startDownload(torrentPath)
    console.log(download)

    setTimeout(() => {
      pauseTorrent(download.id)
    }, 5000)
  }

  const pauseTorrent = async (torrentId: string): Promise<void> => {
    console.log('Pausing')
    await window.api.pauseDownload(torrentId)
  }

  return (
    <div>
      <button onClick={showDialog}>Open Torrent</button>
      <button onClick={() => pauseTorrent('')}>Pause Torrent</button>
    </div>
  )
}

export default Dashboard
