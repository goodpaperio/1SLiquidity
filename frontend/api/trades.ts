import axios from 'axios'
import { Trade } from '../app/lib/types/trade'

// Helper function to get timestamp for relative dates
const getTimestamp = (daysAgo: number): number => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.getTime()
}

// Convert a product to a trade
const productToTrade = (product: any): Trade => ({
  invoice: `INV${product.id}`,
  action: 'INSTASETTLE',
  amount1: `$${(product.price * 0.1).toFixed(2)}`,
  amount2: `$${product.price.toFixed(2)}`,
  savings: product.discountPercentage.toFixed(0),
  duration: `${Math.floor(Math.random() * 10 + 1)} mins`,
  bps: (Math.random() * 100).toFixed(0),
  isOwner: Math.random() > 0.5,
  timestamp: getTimestamp(Math.floor(Math.random() * 30)), // Random timestamp within last 30 days
})

const fetchTrades = async (limit: number, skip: number) => {
  const response = await axios.get(
    `https://dummyjson.com/products?limit=${limit}&skip=${skip}`
  )

  // Map products to trades
  const trades = response.data.products.map(productToTrade)

  return {
    trades,
    total: response.data.total,
    skip: response.data.skip,
    limit: response.data.limit,
  }
}

const tradesApi = {
  fetchTrades,
}

export default tradesApi
