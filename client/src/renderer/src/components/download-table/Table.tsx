import { columns, Payment } from './columns'
import { DataTable } from './data-table'

export default function Table() {
  const data: Payment[] = [
    {
      id: 'test',
      amount: 123,
      status: 'pending',
      email: 'test@test.com'
    }
  ]

  return (
    <div className="container mx-auto py-10">
      <DataTable columns={columns} data={data} />
    </div>
  )
}
