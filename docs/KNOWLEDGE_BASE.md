# Updating the Raghad AI Knowledge Base

## Quick start (local)

1. Add your OpenAI key to `.env`:
   ```
   OPENAI_API_KEY=sk-proj-...
   ```

2. Index the knowledge base:
   ```bash
   npm run rag:index
   ```

3. Start the app and test chat:
   ```bash
   npm run dev
   ```

4. Or trigger indexing via API (with dev server running):
   ```bash
   curl -X POST http://localhost:3000/api/rag/index-sample
   ```

5. Check index status:
   ```bash
   curl http://localhost:3000/api/rag/index-sample
   ```

## Sample files

- `sample-data/sample-kb-ar.txt` — Arabic content (6 sectors)
- `sample-data/sample-kb-en.txt` — English content

Replace or extend these with client documents. Re-run `npm run rag:index` after changes.

## Production (Vercel)

SQLite does **not** persist on Vercel. For live deployment:

1. Create a free [Neon](https://neon.tech) PostgreSQL database
2. Set `DATABASE_URL` in Vercel environment variables
3. Change `prisma/schema.prisma` provider to `postgresql`
4. Run `npx prisma db push`
5. Set `OPENAI_API_KEY` in Vercel
6. Call `POST /api/rag/index-sample` once after deploy

## Adding client documents later

1. Add PDF/Word/text files to `sample-data/` (or admin upload in Phase 2)
2. Update `src/lib/rag/sample-loader.ts` to load new files
3. Run `npm run rag:index`

## Dialect synonyms

Extend local terms in `src/lib/rag/dialect.ts` as you discover new Gulf Arabic expressions from user feedback.
