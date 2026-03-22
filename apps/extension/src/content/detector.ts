import type { PageType } from '../types'

// ── Page type detection using URL patterns, schema.org, and DOM signals ──

const CART_URL_PATTERNS = [
  /\/cart/i, /\/basket/i, /\/bag\b/i, /\/shopping[\-_]?bag/i,
  /\/viewcart/i, /\/mycart/i, /gp\/cart/i,
]

const CHECKOUT_URL_PATTERNS = [
  /\/checkout/i, /\/payment/i, /\/order[\-_]?review/i,
  /\/place[\-_]?order/i, /\/buy\/spc/i,
]

const PRODUCT_URL_PATTERNS = [
  /\/dp\//i, /\/product[s]?\//i, /\/item[s]?\//i,
  /\/p\//i, /\/-\/A-/i,  // Target pattern
  /\/ip\//i,              // Walmart pattern
  /\/pd\//i,
]

const CATEGORY_URL_PATTERNS = [
  /\/categor/i, /\/browse/i, /\/department/i, /\/shop\//i,
  /\/s\?/i, /\/search/i, /\/collection/i,
]

function detectFromUrl(url: string): PageType | null {
  for (const p of CART_URL_PATTERNS) if (p.test(url)) return 'cart'
  for (const p of CHECKOUT_URL_PATTERNS) if (p.test(url)) return 'checkout'
  for (const p of PRODUCT_URL_PATTERNS) if (p.test(url)) return 'product'
  for (const p of CATEGORY_URL_PATTERNS) if (p.test(url)) return 'category'
  return null
}

function detectFromSchemaOrg(): PageType | null {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]')
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent ?? '')
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        const type = item['@type']
        if (type === 'Product' || type === 'IndividualProduct') return 'product'
        if (type === 'ItemList' || type === 'OfferCatalog') return 'category'
        if (type === 'CheckoutPage' || type === 'Order') return 'checkout'
      }
    } catch { /* ignore malformed JSON-LD */ }
  }
  return null
}

function detectFromDom(): PageType | null {
  // Cart signals
  const bodyText = document.body?.innerText?.slice(0, 5000) ?? ''
  const hasCartHeading = /shopping\s*cart|your\s*cart|my\s*cart|your\s*bag|order\s*summary/i.test(bodyText)
  const hasQuantityInputs = document.querySelectorAll('input[name*="qty"], input[name*="quantity"], input[type="number"][min]').length >= 2
  const hasCheckoutButton = !!document.querySelector('a[href*="checkout"], button[data-action*="checkout"], [class*="checkout" i]')
  if (hasCartHeading && (hasQuantityInputs || hasCheckoutButton)) return 'cart'

  // Checkout signals
  const hasPaymentForm = !!document.querySelector('[name*="card_number"], [name*="cardNumber"], [data-testid*="payment"]')
  if (hasPaymentForm || /place\s*order|payment\s*method|billing\s*address/i.test(bodyText.slice(0, 3000))) return 'checkout'

  // Product signals
  const hasAddToCart = !!document.querySelector(
    'button[id*="add-to-cart" i], button[class*="add-to-cart" i], ' +
    'button[data-action*="add" i], [id="add-to-cart-button"], ' +
    'button[aria-label*="add to cart" i], [class*="addToCart" i], ' +
    'input[value*="Add to Cart" i], button[name="add"]'
  )
  const hasProductTitle = !!document.querySelector(
    'h1[class*="product" i], h1[data-testid*="product" i], ' +
    '[id="productTitle"], [class*="product-title" i], [class*="product-name" i]'
  )
  const hasPrice = !!document.querySelector(
    '[class*="price" i], [data-testid*="price" i], [itemprop="price"]'
  )
  if (hasAddToCart && (hasProductTitle || hasPrice)) return 'product'

  // Category/search signals
  const hasProductGrid = document.querySelectorAll('[class*="product-card" i], [class*="product-item" i], [data-component-type="s-search-result"]').length >= 3
  if (hasProductGrid) return 'category'

  return null
}

export function detectPageType(): PageType {
  const url = window.location.href
  return detectFromUrl(url) ?? detectFromSchemaOrg() ?? detectFromDom() ?? 'unknown'
}
