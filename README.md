# Waste Wise - BeachHacks 9.0

An AI-powered sustainability platform that helps consumers understand and reduce their environmental footprint through receipt scanning, waste classification, and real-time eco-scoring while shopping online.

## Authors

[Lucas Amberg](https://github.com/lucas-amberg), [Edong Lee](https://github.com/edogthelegend), and Jacob Paolinelli

## About the Project

### Inspiration

Every day, consumers make dozens of purchasing decisions without understanding their environmental impact. We wanted to build a tool that makes sustainability effortless — meeting people where they already are: at checkout. Whether you're reviewing a grocery receipt, throwing something away, or browsing Amazon, Waste Wise gives you the information you need to make greener choices without changing your routine.

### What We Learned

- How to build a Turborepo monorepo coordinating a Next.js web app and a WXT browser extension sharing a unified design language
- Integrating Google Gemini's multimodal capabilities for both image analysis (receipt scanning, waste classification) and structured product eco-scoring
- Building a Python-based AI agent with Fetch.ai's uagents protocol to handle real-time product sustainability analysis
- Designing a Chrome extension that monitors shopping cart changes across major retailers using content scripts and the Chrome API
- Working with Supabase for real-time data persistence and user dashboard tracking

### How We Built It

Waste Wise is a monorepo with two apps managed by Turborepo:

1. **Web App** — A Next.js 16 application where users can upload receipt images or photos of waste items. Gemini's multimodal API analyzes the images, extracts product information, and returns eco-scores with sustainability details and greener alternatives. A dashboard tracks the user's environmental impact over time using Supabase.

2. **Browser Extension** — A WXT-powered Chrome extension that watches shopping carts on major retail sites (Amazon, Target, Walmart, Kroger, and more). When products are detected, they're sent to a FastAPI backend agent that uses Gemini to score each item's sustainability on an A-F scale and suggest eco-friendly alternatives — all in real-time as you shop.

### Challenges

- Parsing product data from diverse retailer DOM structures — every site has a different layout, requiring custom content scripts for each
- Getting Gemini to return consistent, structured JSON responses for eco-scoring across wildly different product categories
- Coordinating state between the Chrome extension's content scripts, background service worker, and popup UI
- Handling image-to-text extraction from receipt photos with varying quality, lighting, and formatting

## Description

Waste Wise is a two-part sustainability platform:

- **Receipt Scanner** — Upload a photo of any receipt. AI extracts each item, scores its environmental impact, and suggests greener alternatives.
- **Waste Classifier** — Snap a photo of any waste item to learn whether it's recyclable, compostable, or landfill, with personalized disposal recommendations.
- **Shopping Cart Eco-Scorer (Browser Extension)** — Monitors your cart on Amazon, Target, Walmart, Kroger, and other retailers. Each product gets a real-time sustainability grade (A-F) with recommended alternatives.
- **Impact Dashboard** — Track your eco-scores and sustainability progress over time.

## Technologies and Libraries Used

### Core Framework and Build Tools
- **[Next.js 16](https://nextjs.org/)** — React framework with server-side rendering and App Router
- **[React 19](https://react.dev/)** — JavaScript library for building user interfaces
- **[Turborepo](https://turbo.build/)** — Monorepo build system for managing the web app and extension
- **[WXT](https://wxt.dev/)** — Framework for building cross-browser extensions with modern tooling
- **[TypeScript](https://www.typescriptlang.org/)** — JavaScript with static type checking

### AI and Machine Learning
- **[Google Gemini API](https://ai.google.dev/)** (`@google/genai`) — Multimodal AI for receipt scanning, waste classification, and product eco-scoring
- **[Fetch.ai uagents](https://fetch.ai/)** (`uagents-core`) — Agent protocol for the sustainability scoring backend

### Backend
- **[FastAPI](https://fastapi.tiangolo.com/)** — Python web framework for the extension's scoring agent
- **[Uvicorn](https://www.uvicorn.org/)** — ASGI server for the FastAPI backend
- **[Pydantic](https://docs.pydantic.dev/)** — Data validation and serialization

### Database
- **[Supabase](https://supabase.com/)** (`@supabase/supabase-js`) — Open source Firebase alternative for database and user data persistence

### UI Components and Styling
- **[Tailwind CSS 4](https://tailwindcss.com/)** — Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** — Re-usable UI component library
- **[Base UI](https://base-ui.com/)** (`@base-ui/react`) — Headless UI component primitives
- **[Lucide React](https://lucide.dev/)** — Icon library
- **[class-variance-authority](https://cva.style/)** — Component variant management
- **[clsx](https://github.com/lukeed/clsx)** / **[tailwind-merge](https://github.com/dcastil/tailwind-merge)** — Utility class merging
- **[tw-animate-css](https://github.com/nicholasgriffintn/tw-animate-css)** — Tailwind animation utilities

### Browser Extension
- **[Chrome API](https://developer.chrome.com/docs/extensions/)** — Extension APIs for tabs, storage, and content scripts
- **[Vite](https://vitejs.dev/)** — Build tool powering the WXT extension bundling

### Developer Tools
- **[ESLint](https://eslint.org/)** — JavaScript/TypeScript linter
- **[PostCSS](https://postcss.org/)** — CSS processing with Tailwind

## Installation

```bash
# Install dependencies
npm install

# Run both apps in development
npm run dev

# Run only the web app
npm run dev:web

# Run only the extension
npm run dev:extension

# Run the Python scoring agent
cd apps/extension
npm run agent
```

## Environment Variables

This project requires the following environment variables:

### Web App (`apps/web/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### Extension Agent (`apps/extension/agent/.env`)
```
GEMINI_API_KEY=your_gemini_api_key
```

## License

This project is private and not intended for redistribution.
