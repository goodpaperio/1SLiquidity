'use client'

import { Suspense } from 'react'
import Transactions from '../components/transactions'

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Transactions />
    </Suspense>
  )
}
