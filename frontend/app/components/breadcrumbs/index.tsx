import Image from 'next/image'
import Link from 'next/link'

type BreadcrumbProps = {
  links: BREADCRUMBS_LINKS[]
}

const Breadcrumbs: React.FC<BreadcrumbProps> = ({ links }) => {
  return (
    <div className="flex gap-[5px] items-center">
      {links.map((link, ind) => (
        <div key={link.title} className="flex gap-2 items-center">
          <Link
            href={link.href}
            className={`${link.active ? '' : 'text-white'} text-[14px]`}
          >
            {link.title}
          </Link>
          {ind < links.length - 1 && (
            <Image
              src="/icons/small-right-arrow.svg"
              alt="chevron"
              className="w-fit h-fit mr-1"
              width={10}
              height={10}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default Breadcrumbs
