import { useEffect, useState } from 'react'

const AddTorrentModal = () => {
  if (!open) return null

  const [filePaths, setFilePaths] = useState([])

  useEffect(() => {
    window.api.onFloatingData((data) => {
      setFilePaths(data)
    })
  }, [])

  return (
    <div className="">
      <div className="">
        <div className="text-red-500">The torrent selected was: {filePaths}</div>
      </div>
    </div>
  )
}

export default AddTorrentModal
