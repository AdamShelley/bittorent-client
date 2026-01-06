import { ColumnDef } from '@tanstack/react-table'

export const columns: ColumnDef<any>[] = [
  {
    accessorKey: 'status',
    header: 'Status'
  },
  {
    accessorKey: 'name',
    header: 'Name'
  },
  {
    accessorKey: 'size',
    header: 'Size'
  },
  {
    accessorKey: 'downloaded',
    header: 'Downloaded'
  },
  {
    accessorKey: 'dl_speed',
    header: 'Download Speed'
  },
  {
    accessorKey: 'ul_speed',
    header: 'Upload Speed'
  }
]
