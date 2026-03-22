// ── Page Detection ──
export type PageType = 'product' | 'cart' | 'checkout' | 'category' | 'unknown'
export type Confidence = 'high' | 'medium' | 'low'

// ── Product Extraction ──
export interface DetectedProduct {
  name: string
  brand?: string
  price?: number
  currency?: string
  imageUrl?: string
  productUrl?: string
  quantity?: number
  variant?: string
  category?: string
  keywords: string[]
  confidence: Confidence
}

// ── Scoring ──
export interface ProductScore {
  score: number
  grade: string
  color: string
  explanation: string
  factors: ScoreFactor[]
  alternatives?: Array<{ name: string; reason: string }>
  source?: 'agentverse' | 'gemini' | 'keyword'
}

export interface ScoreFactor {
  label: string
  impact: number
  detail: string
}

export interface CartScore {
  score: number
  grade: string
  color: string
  totalItems: number
}

// ── Recommendations ──
export interface Alternative {
  name: string
  reason: string
  searchUrl: string
}

export interface Recommendation {
  alternative: Alternative
}

// ── Analysis Result (shared between content script & side panel) ──
export interface AnalyzedProduct {
  detected: DetectedProduct
  score: ProductScore
  recommendations: Recommendation[]
}

export interface PageAnalysis {
  pageType: PageType
  url: string
  timestamp: number
  products: AnalyzedProduct[]
  cartScore: CartScore | null
  summary: AnalysisSummary
}

export interface AnalysisSummary {
  totalProducts: number
  averageScore: number
  swapsAvailable: number
  potentialImprovement: number
}

// ── Site Adapter ──
export interface SiteAdapter {
  name: string
  matches: (url: string) => boolean
  extractProducts: (pageType: PageType) => DetectedProduct[]
}
