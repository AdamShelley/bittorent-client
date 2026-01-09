// Menu items.
const items = []

export function AppSidebar() {
  return (
    <div className="h-full w-full p-3">
      <div className="border bg-zinc-900 p-2">
        <ul className="font-light text-zinc-200 text-md flex flex-col ">
          <li className="hover:bg-zinc-800 cursor-pointer p-1">Downloading</li>
          <li>Downloaded</li>
          <li>Uploading</li>
          <li>Finished</li>
        </ul>
      </div>
    </div>
  )
}
