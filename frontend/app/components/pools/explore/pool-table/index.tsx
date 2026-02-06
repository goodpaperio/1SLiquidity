import Button from '@/app/components/button'
import Image from 'next/image'
import Link from 'next/link'

type Props = {
  onAddLiquidity: () => void
}

const PoolTable: React.FC<Props> = ({ onAddLiquidity }) => {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="relative overflow-x-auto mt-10">
        <table className="w-full bg-transparent text-left rtl:text-right text-gray-500 text-[16px]">
          <thead className="text-white uppercase bg-transaprent border-b border-primary">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 min-w-[250px] md:min-w-[10vw]"
              >
                Pool Token
              </th>
              <th
                scope="col"
                className="px-4 py-3 min-w-[250px] md:min-w-[20vw]"
              ></th>
              <th
                scope="col"
                className="px-4 py-3 min-w-[250px] md:min-w-[12vw]"
              >
                Liquidity
              </th>
              <th
                scope="col"
                className="px-4 py-3 min-w-[300px] md:min-w-[12vw]"
              >
                APR 1D
              </th>
              <th
                scope="col"
                className="px-4 py-3 min-w-[250px] md:min-w-[12vw] text-right"
              >
                Est. Yield 1D
              </th>
              <th
                scope="col"
                className="px-4 py-3 min-w-[250px] md:min-w-[10vw]"
              ></th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pool, ind) => (
              <tr className="border-b border-primary" key={ind}>
                <td className="px-4 py-4">
                  <div className="flex gap-2 items-center">
                    <div className="w-8 h-8 rounded-full border-[2px] p-0.5 border-success flex justify-center items-center">
                      <Image
                        src="/tokens/eth.svg"
                        alt="token"
                        className="w-full h-full"
                        width={1000}
                        height={1000}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[18px]">Eth</span>
                      <span className="text-white">$999.9M</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="w-full flex justify-center">
                    <div className="w-[180px]">
                      <Button
                        theme="gradient"
                        text="Add Liquidity"
                        onClick={onAddLiquidity}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">$9.99M</td>
                <td className="px-4 py-4">
                  <div className="flex flex-col">
                    <span>$9.99M</span>
                    <div className="flex gap-1 items-center">
                      <Image
                        src={'/icons/progress-down.svg'}
                        alt="progress"
                        className="w-2"
                        width={1000}
                        height={1000}
                      />
                      <span className="text-[14px] text-primaryRed">
                        $9.99M
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-right">0</td>
                <td className="px-4 py-4">
                  <Link
                    href={`/pools/${'0x2a4941dsfdgdfngkd74642f'}`}
                    className="w-full flex justify-end"
                  >
                    <Image
                      src={'/icons/right-arrow.svg'}
                      alt="arrow"
                      className="w-6 cursor-pointer"
                      width={1000}
                      height={1000}
                    />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PoolTable
