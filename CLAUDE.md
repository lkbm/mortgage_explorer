# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a "mortgage explorer" built with:
- **Frontend**: Preact (React alternative) with TypeScript and Vite
- **Backend**: Hono framework running on Cloudflare Workers
- **Storage**: Cloudflare KV for persistent data storage (possibly not used)
- **Deployment**: Cloudflare Workers via Wrangler

## Architecture

### Frontend (src/App.tsx)
- Uses Preact hooks for state management

### Backend (src/main.tsx)
Currently just uses Localstorage for persistence, but set up to use Cloudflare KV eventually:
- Hono server with simple REST API:
  - `GET /api/state/:key` - retrieve data
  - `PUT /api/state/:key` - save data
- Serves static assets from /dist
- Uses Cloudflare KV namespace "mortgage_explorer" for persistence

### Build Configuration
- Vite with Preact preset
- TypeScript with separate configs for app and node code
- Bundle visualization enabled
- React compatibility layer (preact/compat)

## Common Commands

```bash
# Development
npm run dev          # Start development server

# Build and Deploy  
npm run build        # TypeScript compile + Vite build
npm run deploy       # Deploy to Cloudflare Workers

# Code Quality
npm run lint         # ESLint checking
npm run preview      # Preview production build
```

## Development Notes

## TODOs
* Allow user to set their mortgage rate, mortgage amount, and mortgage start date. And I guess "extra payments" (things like tax and whatnot so we can see the actual monthly payment).
* Show default payment schedule: 360 months of the default payment amount, showing how much goes to principal vs interest, and what the remaining balance is after each payment.
* Allow user to trivially add a column that's the same, except with the ability to increase their monthly payment and see the effect, or make occasionally lump-sum payments.
* Each column (which is a group of columns, tbf), has a summary section at the top that shows key stats: total interest paid, time to pay off mortgage, etc.
* Save inputs to Localstorage so they persist across sessions. Including custom payment schedules.

### V2
* Backend persistence via Cloudflare KV?