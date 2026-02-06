import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function ImageFallback({ src, alt, ...rest }: any) {
  const [imgSrc, setImgSrc] = useState(src)
  const fallbackSrc = '/placeholder-dark.jpg'

  useEffect(() => {
    setImgSrc(src)
  }, [src])

  return (
    <Image
      {...rest}
      src={imgSrc}
      onLoadingComplete={(result) => {
        if (result.naturalWidth === 0) {
          setImgSrc(fallbackSrc)
        }
      }}
      onError={() => {
        setImgSrc(fallbackSrc)
      }}
      alt={alt}
    />
  )
}
