import { useState, useEffect } from 'react'
import type { PageAnalysis, AnalyzedProduct, Recommendation } from '@/types'
import { CartScoreGauge } from '@/components/CartScoreGauge'
import { ScoreBadge } from '@/components/ScoreBadge'

interface LoadingState {
  loading: true
  productCount: number
}

type StoredData = PageAnalysis | LoadingState

function isLoading(data: StoredData | null): data is LoadingState {
  return !!data && 'loading' in data && data.loading === true
}

export function App() {
  const [data, setData] = useState<StoredData | null>(null)

  useEffect(() => {
    chrome.storage?.local?.get('wastewise-analysis', (result: Record<string, unknown>) => {
      const stored = result['wastewise-analysis'] as StoredData | undefined
      if (stored) setData(stored)
    })

    const handler = (changes: Record<string, chrome.storage.StorageChange>) => {
      const change = changes['wastewise-analysis']
      if (change?.newValue) setData(change.newValue as StoredData)
    }
    chrome.storage?.onChanged?.addListener(handler)
    return () => chrome.storage?.onChanged?.removeListener(handler)
  }, [])

  const handleRescan = () => {
    chrome.runtime?.sendMessage({ type: 'RESCAN_PAGE' })
  }

  const loading = isLoading(data)
  const analysis = loading ? null : data as PageAnalysis | null

  return (
    <div className="min-h-screen bg-[#064E3B] text-white p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">
            <span className="text-[#059669]">Waste</span>Wise
          </h1>
          <p className="text-xs text-gray-500">Sustainability Dashboard</p>
        </div>
        <button
          onClick={handleRescan}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-[#059669]/10 text-[#059669] text-xs font-semibold hover:bg-[#059669]/20 transition-colors disabled:opacity-40"
        >
          {loading ? 'Scanning...' : 'Rescan Page'}
        </button>
      </div>

      {loading ? (
        <LoadingIndicator productCount={data.productCount} />
      ) : !analysis ? (
        <EmptyState />
      ) : analysis.products.length === 0 ? (
        <EmptyState message="No products detected on this page." />
      ) : (
        <>
          {/* Page type badge */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-[#047857] text-gray-400 text-xs font-medium capitalize">
              {analysis.pageType} page
            </span>
            <span className="text-xs text-gray-600 truncate">{new URL(analysis.url).hostname}</span>
          </div>

          {/* Cart score */}
          {analysis.cartScore && (
            <CartScoreGauge cartScore={analysis.cartScore} />
          )}

          {/* Summary bar */}
          <SummaryBar analysis={analysis} />

          {/* Product list */}
          <div className="space-y-3">
            <h2 className="text-white font-semibold text-sm">
              Detected Products ({analysis.products.length})
            </h2>
            {analysis.products.map((ap, i) => (
              <ProductCard key={i} product={ap} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function LoadingIndicator({ productCount }: { productCount: number }) {
  return (
    <div className="text-center py-16 space-y-5">
      {/* Spinner */}
      <div className="flex justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-[#047857] border-t-[#059669] animate-spin" />
      </div>
      <div className="space-y-1.5">
        <p className="text-white text-sm font-medium">Analyzing {productCount} product{productCount !== 1 ? 's' : ''}...</p>
        <p className="text-gray-500 text-xs">Fetch AI is scoring sustainability</p>
      </div>
      {/* Skeleton cards */}
      <div className="space-y-2 max-w-[280px] mx-auto">
        {Array.from({ length: Math.min(productCount, 4) }).map((_, i) => (
          <div key={i} className="bg-[#065F46] border border-[#047857] rounded-xl p-3 flex items-center gap-3 animate-pulse" style={{ animationDelay: `${i * 150}ms` }}>
            <div className="w-9 h-9 rounded-lg bg-[#047857]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-[#047857] rounded w-3/4" />
              <div className="h-2 bg-[#047857] rounded w-1/2" />
            </div>
            <div className="w-8 h-8 rounded-full bg-[#047857]" />
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ message }: { message?: string }) {
  return (
    <div className="text-center py-16 space-y-3">
      <div className="text-4xl">
        {'\uD83D\uDED2'}
      </div>
      <p className="text-gray-500 text-sm">
        {message ?? 'Browse a shopping site to see sustainability insights.'}
      </p>
      <p className="text-gray-600 text-xs">
        Works on Amazon, Target, Walmart, and many more.
      </p>
    </div>
  )
}

function SummaryBar({ analysis }: { analysis: PageAnalysis }) {
  const { summary } = analysis
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-[#065F46] border border-[#047857] rounded-lg p-3 text-center">
        <p className="text-lg font-bold text-white">{summary.totalProducts}</p>
        <p className="text-xs text-gray-500">Products</p>
      </div>
      <div className="bg-[#065F46] border border-[#047857] rounded-lg p-3 text-center">
        <p className="text-lg font-bold text-[#059669]">{summary.swapsAvailable}</p>
        <p className="text-xs text-gray-500">Swaps Found</p>
      </div>
      <div className="bg-[#065F46] border border-[#047857] rounded-lg p-3 text-center">
        <p className="text-lg font-bold text-[#059669]">+{summary.potentialImprovement}</p>
        <p className="text-xs text-gray-500">Potential</p>
      </div>
    </div>
  )
}

function ProductCard({ product }: { product: AnalyzedProduct }) {
  const { detected, score, recommendations } = product
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-[#065F46] border border-[#047857] rounded-xl overflow-hidden">
      {/* Product header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-start gap-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        {detected.imageUrl && (
          <img
            src={detected.imageUrl}
            alt=""
            className="w-11 h-11 rounded-lg object-cover bg-[#047857] shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium leading-tight line-clamp-2">{detected.name}</p>
          <p className="text-gray-500 text-xs mt-0.5">
            {[detected.brand, detected.price ? `$${detected.price.toFixed(2)}` : null].filter(Boolean).join(' \u00b7 ')}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <ScoreBadge score={score.score} size="md" />
          <span className="text-gray-600 text-xs">{expanded ? '\u25B2' : '\u25BC'}</span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-[#047857]">
          {/* Score explanation */}
          <div className="mt-3 p-2.5 rounded-lg bg-white/[0.02]">
            <p className="text-gray-400 text-xs leading-relaxed">{score.explanation}</p>
            <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded font-semibold ${
              detected.confidence === 'high' ? 'bg-[#059669]/15 text-[#34D399]' :
              detected.confidence === 'medium' ? 'bg-yellow-500/15 text-yellow-400' :
              'bg-red-500/15 text-red-400'
            }`}>
              {detected.confidence} confidence
            </span>
            <SourceBadge source={score.source} />
          </div>

          {/* Score factors */}
          {score.factors.length > 0 && (
            <div className="space-y-1">
              {score.factors.slice(0, 4).map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${f.impact > 0 ? 'bg-[#059669]' : 'bg-red-400'}`} />
                  <span className="text-gray-400">{f.detail}</span>
                  <span className={`ml-auto font-semibold ${f.impact > 0 ? 'text-[#059669]' : 'text-red-400'}`}>
                    {f.impact > 0 ? '+' : ''}{f.impact}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {recommendations.map((rec, i) => (
            <RecommendationCard key={i} rec={rec} />
          ))}
        </div>
      )}
    </div>
  )
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const { alternative } = rec

  return (
    <div className="p-3 rounded-lg bg-[#059669]/[0.04] border border-[#059669]/15">
      <p className="text-[#059669] text-[10px] font-bold uppercase tracking-wider mb-2">Better Alternative</p>
      <p className="text-white text-sm font-semibold">{alternative.name}</p>
      <p className="text-gray-400 text-xs mt-1 leading-relaxed">{alternative.reason}</p>
      <a
        href={alternative.searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-2 text-center py-1.5 rounded-lg bg-[#059669]/12 text-[#059669] text-xs font-semibold hover:bg-[#059669]/22 transition-colors"
      >
        Find on this site
      </a>
    </div>
  )
}

function SourceBadge({ source }: { source?: string }) {
  if (!source) return null
  const styles = {
    agentverse: 'bg-[#059669]/15 text-[#34D399]',
    gemini: 'bg-gray-500/15 text-gray-400',
    keyword: 'bg-yellow-500/15 text-yellow-400',
  }
  const labels = {
    agentverse: 'AI Agent',
    gemini: 'Gemini',
    keyword: 'Estimated',
  }
  const style = styles[source as keyof typeof styles] ?? styles.gemini
  const label = labels[source as keyof typeof labels] ?? source
  return (
    <span className={`inline-block ml-1 mt-1 text-[10px] px-1.5 py-0.5 rounded font-semibold ${style}`}>
      {label}
    </span>
  )
}
