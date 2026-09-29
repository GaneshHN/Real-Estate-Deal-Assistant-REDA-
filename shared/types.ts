export type PropertyType = 'Apartment' | 'Villa' | 'Plot' | 'Commercial' | 'House'
export type ListingType = 'Sale' | 'Rent'
export type PropertyStatus = 'Available' | 'Under Offer' | 'Sold' | 'Rented' | 'Inactive'

export type Property = {
  id: string
  title: string
  propertyType: PropertyType
  listingType: ListingType
  location: string
  city: string
  area: number
  bedrooms: number
  bathrooms: number
  floor?: number | null
  totalFloors?: number | null
  price: number
  description: string
  amenities: string[]
  ownerName: string
  ownerPhone: string
  ownerEmail: string
  assignedAgent?: string | null
  status: PropertyStatus
  lastVerifiedAt: string
  leads?: Array<{ id: string; name: string; email: string; phone?: string; status: string }>
  siteVisits?: Array<{ id: string; scheduledAt: string; leadName: string; status: string }>
  createdAt?: string
  updatedAt?: string
}

export type PropertyInput = Omit<Property, 'id' | 'leads' | 'siteVisits' | 'createdAt' | 'updatedAt'>
export type HealthResponse = { success: boolean; service: string }
export type ApiResponse<T> = { success: boolean; data?: T; error?: string; pagination?: { page: number; pageSize: number; total: number } }
