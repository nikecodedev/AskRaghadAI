# Raghad AI — Pre-client prep checklist

Work that can be done **before** the client sends materials.

## Step 1: Project foundation ✅
- [x] Next.js + TypeScript + Tailwind initialized
- [x] Folder structure (`components`, `lib`, `messages`, `sample-data`)
- [x] Environment template (`.env.example`)

## Step 2: Localization & RTL
- [x] Arabic / English message files
- [x] Locale + region context (KSA, GCC, Egypt)
- [x] RTL/LTR switching on `<html dir="...">`

## Step 3: App shell
- [x] Header, footer, responsive layout
- [x] Home page with hero + product/service cards (placeholder data)
- [x] Chat page skeleton
- [x] Dashboard page skeleton
- [x] Login / register page skeleton

## Step 4: Database schema
- [x] Prisma schema (users, conversations, documents, chunks)
- [x] SQLite local database (`prisma/dev.db`) for dev before client hosting
- [ ] Switch to PostgreSQL when client provides production `DATABASE_URL`

## Step 5: RAG pipeline skeleton
- [x] Document chunking with overlap
- [x] Dialect synonym enrichment layer
- [x] Hybrid search (embedding + keyword scoring)
- [x] OpenAI integration
- [x] Sample Arabic/English knowledge base (6 sectors)
- [x] DB-backed index storage (persists across requests)
- [ ] Run `npm run rag:index` (needs `OPENAI_API_KEY` in `.env`)

## Step 6: Auth skeleton
- [x] Register / login API routes
- [x] Session cookie helpers
- [ ] Wire to real database (needs `DATABASE_URL`)

## Step 7: Documentation
- [x] Knowledge base update guide
- [x] Deployment notes

## Waiting on client
- OpenAI API key
- Knowledge base documents (PDFs, Word, text)
- Brand assets (logo, colors)
- Hosting / database preference
