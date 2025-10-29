import { Metadata } from 'next'

export function generatePageMetadata({
  title,
  description,
  ogImagePath = '/og-image.png',
  path = '',
}: {
  title?: string
  description: string
  ogImagePath?: string
  path?: string
}): Metadata {
  const isHomePage = !title // Assuming that if no title is passed, it's the home page
  const fullTitle = isHomePage
    ? 'Decastream'
    : `${title ? `${title} | ` : ''}Decastream`
  const descriptionText =
    description ||
    'DECAStream intelligently splits large trades into optimized streams across multiple DEXs.'
  const baseUrl = 'https://deca.stream'
  const fullUrl = `${baseUrl}${path}`

  return {
    title: fullTitle,
    description: descriptionText,
    keywords: ['web3', 'defi', 'dex', 'trade', 'streaming'],
    openGraph: {
      title: fullTitle,
      description: descriptionText,
      type: 'website',
      locale: 'en_US',
      url: fullUrl,
      siteName: 'Decastream',
      images: [
        {
          url: ogImagePath,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: descriptionText,
      creator: '@Decastream',
      site: '@Decastream',
      images: [ogImagePath],
    },
    metadataBase: new URL(baseUrl),
  }
}
