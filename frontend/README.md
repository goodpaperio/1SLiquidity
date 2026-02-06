This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment Setup

Before running the application, you need to set up your environment variables:

1. Copy the `.env.example` file to create a new `.env` file:

```bash
cp .env.example .env
```

2. Open the `.env` file and fill in the required values:
   - `NEXT_PUBLIC_PROJECT_ID`: Your Web3 project ID
   - `NEXT_PUBLIC_BACKEND_URL`: The URL for the backend API
   - `NEXT_PUBLIC_MORALIS_API_KEY`: Your Moralis API key for fetching blockchain data

### Development Server

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Features

- Connect multiple wallets (Metamask, WalletConnect, etc.)
- View token balances and prices
- Select tokens from a comprehensive token list
- Swap tokens with real-time price data
- View transaction history

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
