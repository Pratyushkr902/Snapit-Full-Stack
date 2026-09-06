import React from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'



const DisplayTable = ({ data, column }) => {
  const table = useReactTable({
    data,
    columns : column,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="p-2">
    <table className='w-full py-0 px-0 border-collapse bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm'>
      <thead className='bg-slate-900 dark:bg-slate-950 text-white'>
        {table.getHeaderGroups().map(headerGroup => (
          <tr key={headerGroup.id}>
            <th className='border border-slate-750 dark:border-slate-800 px-3 py-2 text-xs font-bold uppercase tracking-wider'>Sr.No</th>
            {headerGroup.headers.map(header => (
              <th key={header.id} className='border border-slate-750 dark:border-slate-800 px-3 py-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap'>
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody className='divide-y divide-slate-100 dark:divide-slate-800'>
        {table.getRowModel().rows.map((row,index) => (
          <tr key={row.id} className='hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors'>
            <td className='border border-slate-200 dark:border-slate-800 px-3 py-2 text-center text-sm font-semibold text-slate-600 dark:text-slate-400'>{index+1}</td>
            {row.getVisibleCells().map(cell => (
              <td key={cell.id} className='border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap'>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    <div className="h-4" />
  </div>
  )
}

export default DisplayTable