# Mortgage Explorer

A simple application built with Preact, TypeScript, Vite, and Cloudflare Workers to help users explore mortgage payment scenarios.

You can view a deployed version at https://mortgage-explorer.lucamasters.com/

For more details of the structure, see https://github.com/lkbm/workers_kv_scaffolding

## Project Structure

```
├── src/                    # Application source code
│   ├── App.tsx             # Preact frontend component
│   └── main.tsx            # Hono backend (Cloudflare Worker)
├── public/                 # Static assets (will be copied into dist/ on build)
│   └── 404.html            # Served on routes that don't match anything
├── dist/                   # Built frontend assets (generated)
├── index.html              # Entry HTML for Vite
└── [config files]          # See below
```

## Configuration Files Explained

This project has several config files because it runs code in **two different environments**:

| File | Purpose |
|------|---------|
| `tsconfig.json` | **Root config** - ties everything together using project references |
| `tsconfig.app.json` | **Frontend/Worker code** - for `src/` (browser + Cloudflare Workers) |
| `tsconfig.node.json` | **Build tooling** - for `vite.config.ts` (Node.js environment) |
| `vite.config.ts` | **Vite bundler config** - builds the frontend, handles Preact |
| `worker-configuration.d.ts` | **Cloudflare types** - auto-generated types for KV bindings |
| `wrangler.toml` | **Cloudflare Workers config** - deployment settings |

### Why Three TypeScript Configs?

**`tsconfig.json`** (the root)
- Acts as a "solution" file that references the other two configs
- Includes Cloudflare Workers types globally
- Doesn't compile anything itself (`"files": []`)

**`tsconfig.app.json`** (your app code)
- Compiles everything in `src/` plus the worker types
- Targets ES2020 with DOM types for browser compatibility
- Configured for Preact JSX (`jsxImportSource: "preact"`)
- Strict mode enabled with unused variable checking

**`tsconfig.node.json`** (build tools only)
- Only compiles `vite.config.ts`
- Targets ES2022 (modern Node.js)
- No DOM types needed - this runs in Node during build

### Why `worker-configuration.d.ts`?

This file is **auto-generated** by running `wrangler types`. It provides TypeScript definitions for your Cloudflare bindings (KV namespaces, D1 databases, etc.) so you get autocomplete and type-checking when accessing `env.mortgage_explorer` in your worker code.

### Why `vite.config.ts`?

Configures the Vite bundler:
- Enables Preact with the `@preact/preset-vite` plugin
- Sets up React compatibility aliases (`react` → `preact/compat`)
- Configures build output with content hashing for cache-busting
- Includes bundle visualization for analyzing build size

## Commands

```bash
# Development
npm run dev          # Start development server

# Build and Deploy
npm run build        # TypeScript compile + Vite build
npm run deploy       # Deploy to Cloudflare Workers (will build first)


# Code Quality
npm run lint         # ESLint checking
npm run preview      # Preview production build
```

## Run Locally

```bash
nvm use              # Switch to correct Node version
nvm install          # Install Node version if needed
npm run dev          # Start dev server using Vite (no backend; fine if not KV requests)
npx wrangler dev     # Start dev server using wrangler (Includes a local backend)
```

## Deploy

```bash
npx wrangler deploy
```
