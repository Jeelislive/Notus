import type { Metadata } from 'next'
import { SearchPageClient } from '@/components/dashboard/search-page-client'

export const metadata: Metadata = { title: 'Search | Notus' }

export default function SearchPage() {
  return <SearchPageClient />
}
