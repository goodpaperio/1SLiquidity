'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

const DashboardSearchBar = () => {
  const [searchValue, setSearchValue] = useState('')
  const router = useRouter()

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const trimmedValue = searchValue.trim()
    if (trimmedValue) {
      router.push(`/trade/${trimmedValue}`)
    }
  }

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-white/50" />
        <input
          type="text"
          placeholder="Search by Trade ID"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full h-10 pl-10 pr-4 bg-[#1a1a1a]/80 border border-[#373d3f] rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50 transition-colors"
        />
        <button
          type="submit"
          className="absolute right-2 px-3 py-1 text-xs bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors"
        >
          Search
        </button>
      </div>
    </form>
  )
}

export default DashboardSearchBar
