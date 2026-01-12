const items = [
  {
    id: 'downloading',
    name: 'Downloading',
    link: '',
    icon: ''
  },
  {
    id: 'downloaded',
    name: 'Downloaded',
    link: '',
    icon: ''
  },
  {
    id: 'uploading',
    name: 'Uploading',
    link: '',
    icon: ''
  },
  {
    id: 'seeding',
    name: 'Seeding',
    link: '',
    icon: ''
  }
]

export function AppSidebar() {
  return (
    <div className="h-full w-full p-3">
      <div className="border bg-zinc-900 p-2 h-full">
        <ul className="font-light text-zinc-200 text-md flex flex-col ">
          {items.map((item) => (
            <li key={item.id} className="hover:bg-zinc-800 cursor-pointer p-1 text-[15px]">
              {item.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
