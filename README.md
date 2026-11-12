# SmartShop NZ

An AI shopping-research agent that helps find better buying options in New Zealand, where imported goods often carry high distribution overhead.

## What it does

- **Product analysis** — search NZ providers for prices across brands and specifications.
- **Substitution research** — find substitute brands/products from main producing countries and compare prices in NZD.
- **Buying options** — recommend options based on price, shipping, and after-sales needs.

## Stack

React + TypeScript + Vite, the Vercel AI SDK (`@ai-sdk/openai`), and Tavily search.

## Getting started

```bash
npm install
npm run dev
```

Create a `.env` with the required provider/search API keys. API keys are not committed to this repository.

Build and deploy:

```bash
npm run build
npm run preview
./deploy.sh
```

## Documentation

- `vision.md` — problem statement and product ideas.

## Status

Early-stage MVP.
