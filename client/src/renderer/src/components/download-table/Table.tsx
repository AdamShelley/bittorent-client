import { columns } from './columns'
import { DataTable } from './data-table'

export default function Table() {
  const data = [
    {
      id: 'test',
      status: 'pending',
      name: 'Test Torrent',
      size: 15,
      downloaded: 5,
      dl_speed: 500,
      ul_speed: 200
    }
  ]

  return (
    <div className="">
      <DataTable columns={columns} data={data} />
    </div>
  )
}
