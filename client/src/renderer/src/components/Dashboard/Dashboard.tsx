const Dashboard = (): React.JSX.Element => {
  const showDialog = async (): Promise<void> => {
    const result = await window.api.openFileDialog()
    console.log(result)
  }

  return (
    <div>
      <button onClick={showDialog}>Open Torrent</button>
    </div>
  )
}

export default Dashboard
