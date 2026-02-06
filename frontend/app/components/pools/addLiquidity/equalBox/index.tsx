import Image from 'next/image'

type Props = {
  active: boolean
}

const EqualBox: React.FC<Props> = ({ active = false }) => {
  return (
    <div className="w-16 h-16 overflow-hidden flex gap-4 p-2">
      <div
        className={`w-full h-full rounded-[4px] flex justify-center items-center p-1 ${
          active
            ? 'bg-gradient-to-r from-[#071310] to-[#062118]'
            : 'bg-neutral-800'
        }`}
      >
        <Image
          src={'/icons/equal.svg'}
          alt="swap"
          className="-rotate-45 w-3"
          width={1000}
          height={1000}
        />
      </div>
    </div>
  )
}

export default EqualBox
