import type { PageAnalysis, AnalyzedProduct, Recommendation } from '../types'

// ════════════════════════════════════════════
//  INJECTED FLOATING WIDGET (Shadow DOM)
// ════════════════════════════════════════════

const WIDGET_CSS = `
:host {
  all: initial;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 2147483647;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

.cs-badge {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: -0.5px;
}
.cs-badge:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 28px rgba(59, 130, 246, 0.5);
}
.cs-badge-count {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: white;
  font-size: 11px;
  font-weight: 700;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #0a0d14;
}

.cs-panel {
  position: fixed;
  bottom: 88px;
  right: 20px;
  width: 380px;
  max-height: 520px;
  background: #0a0d14;
  border: 1px solid #1e293b;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0,0,0,0.6);
  display: none;
  flex-direction: column;
  animation: cs-slideUp 0.25s ease-out;
}
.cs-panel.open { display: flex; }

@keyframes cs-slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.cs-header {
  padding: 16px 16px 12px;
  border-bottom: 1px solid #1e293b;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #111827;
}
.cs-logo {
  font-size: 16px;
  font-weight: 700;
  color: white;
}
.cs-logo span { color: #3b82f6; }
.cs-close {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}
.cs-close:hover { color: white; }

.cs-summary {
  padding: 12px 16px;
  background: #111827;
  border-bottom: 1px solid #1e293b;
  display: flex;
  gap: 12px;
  align-items: center;
}
.cs-score-circle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cs-score-num {
  font-size: 18px;
  font-weight: 800;
  color: white;
  line-height: 1;
}
.cs-score-grade {
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
}
.cs-summary-text {
  flex: 1;
}
.cs-summary-text p {
  color: #9ca3af;
  font-size: 12px;
  line-height: 1.4;
}
.cs-summary-text p strong {
  color: white;
}
.cs-improvement {
  color: #3b82f6 !important;
  font-weight: 600;
}

.cs-body {
  overflow-y: auto;
  max-height: 340px;
  padding: 8px;
}

.cs-product {
  padding: 12px;
  margin: 4px 0;
  background: #111827;
  border: 1px solid #1e293b;
  border-radius: 12px;
}
.cs-product-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 6px;
}
.cs-product-img {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
  background: #1e293b;
  flex-shrink: 0;
}
.cs-product-info { flex: 1; min-width: 0; }
.cs-product-name {
  color: white;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cs-product-meta {
  color: #6b7280;
  font-size: 11px;
  margin-top: 2px;
}
.cs-product-score {
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.cs-explanation {
  color: #9ca3af;
  font-size: 11px;
  line-height: 1.4;
  margin: 6px 0;
  padding: 6px 8px;
  background: rgba(255,255,255,0.03);
  border-radius: 6px;
}

.cs-rec {
  margin-top: 8px;
  padding: 10px;
  background: rgba(59, 130, 246, 0.06);
  border: 1px solid rgba(59, 130, 246, 0.15);
  border-radius: 10px;
}
.cs-rec-label {
  color: #3b82f6;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}
.cs-rec-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.cs-rec-name {
  color: white;
  font-size: 12px;
  font-weight: 600;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs-rec-brand {
  color: #6b7280;
  font-size: 10px;
}
.cs-rec-delta {
  font-size: 11px;
  font-weight: 700;
  color: #3b82f6;
  white-space: nowrap;
}
.cs-rec-price-delta {
  font-size: 10px;
  color: #6b7280;
  margin-top: 2px;
}
.cs-rec-btn {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 6px;
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}
.cs-rec-btn:hover { background: rgba(59, 130, 246, 0.22); }

.cs-confidence {
  display: inline-block;
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 4px;
  font-weight: 600;
  vertical-align: middle;
}
.cs-confidence-high { background: rgba(59,130,246,0.15); color: #60a5fa; }
.cs-confidence-medium { background: rgba(234,179,8,0.15); color: #facc15; }
.cs-confidence-low { background: rgba(239,68,68,0.15); color: #f87171; }

.cs-empty {
  padding: 32px 16px;
  text-align: center;
  color: #6b7280;
  font-size: 13px;
}
`

let widgetRoot: HTMLElement | null = null
let shadowRoot: ShadowRoot | null = null
let isOpen = false

export function injectWidget(analysis: PageAnalysis): void {
  if (!widgetRoot) {
    widgetRoot = document.createElement('div')
    widgetRoot.id = 'wastewise-widget'
    shadowRoot = widgetRoot.attachShadow({ mode: 'closed' })
    document.body.appendChild(widgetRoot)
  }

  render(analysis)
}

export function removeWidget(): void {
  widgetRoot?.remove()
  widgetRoot = null
  shadowRoot = null
}

function render(analysis: PageAnalysis): void {
  if (!shadowRoot) return

  const products = analysis.products
  const count = products.length

  shadowRoot.innerHTML = `
    <style>${WIDGET_CSS}</style>
    <div class="cs-badge" id="cs-toggle">
      WW
      ${count > 0 ? `<div class="cs-badge-count">${count}</div>` : ''}
    </div>
    <div class="cs-panel ${isOpen ? 'open' : ''}" id="cs-panel">
      <div class="cs-header">
        <div class="cs-logo"><span>Waste</span>Wise</div>
        <button class="cs-close" id="cs-close">&times;</button>
      </div>
      ${count === 0 ? `
        <div class="cs-empty">
          No products detected on this page.<br>
          Try a product page or cart page.
        </div>
      ` : `
        ${renderSummary(analysis)}
        <div class="cs-body">
          ${products.map(p => renderProduct(p)).join('')}
        </div>
      `}
    </div>
  `

  // Attach events
  shadowRoot.getElementById('cs-toggle')?.addEventListener('click', () => {
    isOpen = !isOpen
    shadowRoot!.getElementById('cs-panel')?.classList.toggle('open', isOpen)
  })
  shadowRoot.getElementById('cs-close')?.addEventListener('click', () => {
    isOpen = false
    shadowRoot!.getElementById('cs-panel')?.classList.remove('open')
  })

  // Recommendation buttons
  shadowRoot.querySelectorAll('.cs-rec-btn[data-url]').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = (btn as HTMLElement).dataset.url
      if (url) window.open(url, '_blank')
    })
  })
}

function renderSummary(analysis: PageAnalysis): string {
  const { cartScore } = analysis
  const summary = analysis.summary

  if (!cartScore) {
    return `
      <div class="cs-summary">
        <div class="cs-summary-text">
          <p><strong>${summary.totalProducts} product${summary.totalProducts > 1 ? 's' : ''} detected</strong></p>
          ${summary.swapsAvailable > 0
            ? `<p class="cs-improvement">${summary.swapsAvailable} better swap${summary.swapsAvailable > 1 ? 's' : ''} found</p>`
            : '<p>No alternatives available</p>'}
        </div>
      </div>
    `
  }

  const bgColor = cartScore.color + '18'
  return `
    <div class="cs-summary">
      <div class="cs-score-circle" style="background: ${bgColor}; border: 2px solid ${cartScore.color}">
        <div class="cs-score-num">${cartScore.score}</div>
        <div class="cs-score-grade" style="color: ${cartScore.color}">${cartScore.grade}</div>
      </div>
      <div class="cs-summary-text">
        <p><strong>Cart Score: ${cartScore.score}/100</strong> &mdash; ${cartScore.totalItems} items</p>
        ${summary.swapsAvailable > 0
          ? `<p class="cs-improvement">${summary.swapsAvailable} better swaps &middot; +${summary.potentialImprovement} potential</p>`
          : '<p>All items look good!</p>'}
      </div>
    </div>
  `
}

function renderProduct(ap: AnalyzedProduct): string {
  const { detected, score, recommendations } = ap
  const bgColor = score.color + '18'

  const imgHtml = detected.imageUrl
    ? `<img class="cs-product-img" src="${escHtml(detected.imageUrl)}" alt="" />`
    : `<div class="cs-product-img"></div>`

  const priceStr = detected.price ? `$${detected.price.toFixed(2)}` : ''
  const brandStr = detected.brand ? escHtml(detected.brand) : ''
  const metaParts = [brandStr, priceStr].filter(Boolean).join(' &middot; ')

  const confClass = `cs-confidence cs-confidence-${detected.confidence}`

  return `
    <div class="cs-product">
      <div class="cs-product-header">
        ${imgHtml}
        <div class="cs-product-info">
          <div class="cs-product-name">${escHtml(detected.name)}</div>
          ${metaParts ? `<div class="cs-product-meta">${metaParts}</div>` : ''}
        </div>
        <div class="cs-product-score" style="background: ${bgColor}; color: ${score.color}">
          ${score.score}
        </div>
      </div>
      <div class="cs-explanation">
        ${escHtml(score.explanation)}
        <span class="${confClass}">${detected.confidence}</span>
        ${score.source ? `<span class="cs-confidence ${
          score.source === 'agentverse' ? 'cs-confidence-high' :
          score.source === 'keyword' ? 'cs-confidence-medium' :
          'cs-confidence-low'
        }">${score.source === 'agentverse' ? 'AI Agent' : score.source === 'keyword' ? 'Estimated' : 'Gemini'}</span>` : ''}
      </div>
      ${recommendations.map(r => renderRecommendation(r)).join('')}
    </div>
  `
}

function renderRecommendation(rec: Recommendation): string {
  const { alternative } = rec

  return `
    <div class="cs-rec">
      <div class="cs-rec-label">Better Alternative</div>
      <div class="cs-rec-row">
        <div>
          <div class="cs-rec-name">${escHtml(alternative.name)}</div>
          <div class="cs-rec-brand">${escHtml(alternative.reason)}</div>
        </div>
      </div>
      <button class="cs-rec-btn" data-url="${escHtml(alternative.searchUrl)}">Search for This</button>
    </div>
  `
}

function escHtml(str: string): string {
  return (str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
