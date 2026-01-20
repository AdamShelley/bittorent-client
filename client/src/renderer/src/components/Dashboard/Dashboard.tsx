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
  }

  return (
    <div>
      <button onClick={showDialog}>Open Torrent</button>
    </div>
  )
}

export default Dashboard
