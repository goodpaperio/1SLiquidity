import Image from 'next/image'

type Props = {
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  value: string
  setValue?: any
}

const Searchbar: React.FC<Props> = ({ onChange, value, setValue }) => {
  return (
    <div
      className={`max-w-[340px] w-full h-10 border-[2px] rounded-[12px] py-[8px] px-[10px] gap-[8px] flex items-center
         ${value ? 'bg-successGradient border-success' : 'border-primary'}`}
    >
      {/* <Image
        src="/icons/search.svg"
        alt="search"
        className="w-fit h-fit"
        width={20}
        height={20}
      /> */}
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder="Search"
        className={`w-full h-full bg-transparent border-none outline-none placeholder:text-gray`}
      />
      {value && (
        <Image
          src="/icons/circle-close.svg"
          alt="close"
          onClick={() => setValue('')}
          className="w-fit h-fit cursor-pointer"
          width={20}
          height={20}
        />
      )}
    </div>
  )
}

export default Searchbar
