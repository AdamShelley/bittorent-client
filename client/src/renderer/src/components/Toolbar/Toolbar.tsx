const Toolbar = () => {
  const openTorrentFile = async () => {
    const result = await window.api.openFile()
    console.log(result)
  }

  return (
    <div className="border border-orange-200 p-3 flex-1 flex items-center justify-center">
      <ul className="flex gap-4 items-center justify-center">
        <li>
          <button className="border p-2 cursor-pointer" onClick={openTorrentFile}>
            Open
          </button>
        </li>
        <li>Cancel</li>
        <li>Pause</li>
      </ul>
    </div>
  )
}

export default Toolbar
