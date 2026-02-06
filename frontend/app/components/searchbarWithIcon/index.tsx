import Image from 'next/image'
import Link from 'next/link'

type Props = {
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  value: string
  setValue?: any
  placeholder?: string
}

const SearchbarWithIcon: React.FC<Props> = ({
  onChange,
  value,
  setValue,
  placeholder = 'Search',
}) => {
  return (
    <div className="w-full h-full gap-2 flex">
      <div
        className={`max-w-[340px] w-full h-10 rounded-[12px] bg-[#202220] py-[8px] px-[10px] gap-[8px] flex items-center
         ${
           value
             ? 'border-[2px] bg-successGradient border-success'
             : 'border-primary'
         }`}
      >
        <Image
          src="/icons/search.svg"
          alt="search"
          className="w-fit h-fit"
          width={20}
          height={20}
        />
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full h-full bg-transparent border-none outline-none placeholder:text-gray`}
        />
        {value ? (
          <Image
            src="/icons/circle-close.svg"
            alt="close"
            onClick={() => setValue('')}
            className="w-fit h-fit cursor-pointer"
            width={20}
            height={20}
          />
        ) : (
          ''
          // <Image
          //   src="/icons/token.svg"
          //   alt="close"
          //   className="w-6 h-6 cursor-pointer"
          //   width={20}
          //   height={20}
          // />
        )}
      </div>
      {/* {value && (
        <Link
          href={''}
          className="w-10 h-10 rounded-[12px] flex items-center justify-center border-primary border-[2px]"
        >
          <Image
            src="/icons/token.svg"
            alt="logo"
            className="w-6 h-6"
            width={40}
            height={40}
          />
        </Link>
      )} */}
    </div>
  )
}

export default SearchbarWithIcon
