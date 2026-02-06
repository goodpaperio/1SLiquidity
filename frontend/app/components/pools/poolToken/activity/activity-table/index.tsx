import Button from '@/app/components/button'
import Image from 'next/image'

type Props = {}

const ActivityTable: React.FC<Props> = () => {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="relative overflow-x-auto border border-gray rounded-[15px]">
        <table className="w-full text-left rtl:text-right text-gray-500 text-[16px]">
          <thead className="text-white uppercase bg-gray-50 border-b border-primary">
            <tr>
              <th
                scope="col"
                className="px-6 py-4 min-w-[180px] md:min-w-[20%]"
              >
                Date
              </th>
              <th
                scope="col"
                className="px-6 py-4 min-w-[180px] md:min-w-[20%]"
              >
                Type
              </th>
              <th
                scope="col"
                className="px-6 py-4 min-w-[180px] md:min-w-[20%] text-right"
              >
                USD
              </th>
              <th
                scope="col"
                className="px-6 py-4 min-w-[180px] md:min-w-[20%] text-right"
              >
                ETH
              </th>
              <th
                scope="col"
                className="px-6 py-4 min-w-[180px] md:min-w-[10%]"
              >
                Link
              </th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pool, ind) => (
              <tr className="border-b border-primary" key={ind}>
                <td className="px-6 py-4">11/20/2024</td>
                <td className="px-6 py-4 text-primary">BUY</td>
                <td className="px-6 py-4 text-right">$99,999.99M</td>
                <td className="px-6 py-4">9.99</td>
                <td className="px-6 py-4">
                  <span className="text-primary underline cursor-pointer">
                    Streams
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ActivityTable
