import { Button } from '../ui/button'

const Toolbar = () => {
  const openTorrentFile = async () => {
    const result = await window.api.openFile()
    console.log(result)
  }

  return (
    <div className="border border-orange-200 p-3 flex-1 flex items-center justify-center">
      <ul className="flex gap-4 items-center justify-center">
        <li>
          <Button variant="outline" onClick={openTorrentFile}>
            Open
          </Button>
        </li>
        <li>
          <Button variant="outline">Cancel</Button>
        </li>
        <li>
          <Button variant="outline">Pause</Button>
        </li>
      </ul>
    </div>
  )
}

export default Toolbar
