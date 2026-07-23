# Deploy Raghad AI to Vercel + Neon

## Step 1 — Create Neon database (free)

1. Go to [https://neon.tech](https://neon.tech) and sign up
2. Create a project named `raghad-ai`
3. Copy the **PostgreSQL connection string** (pooled recommended for Vercel):
   ```
   postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

## Step 2 — Push code to GitHub

```powershell
cd D:\task\freelancer\raghad-ai
git add .
git commit -m "Add RAG pipeline, luxury UI, Vercel/Neon production config"
git push origin main
```

## Step 3 — Connect Vercel

1. Go to [https://vercel.com](https://vercel.com) → **Add New Project**
2. Import `pikachu1001/raghad-ai` from GitHub
3. Framework: **Next.js** (auto-detected)

## Step 4 — Environment variables (Vercel → Settings → Environment Variables)

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Your Neon PostgreSQL connection string |
| `OPENAI_API_KEY` | Client's OpenAI key |
| `AUTH_SECRET` | Random string (e.g. `openssl rand -hex 32`) |
| `NEXT_PUBLIC_APP_URL` | `https://raghad-ai.vercel.app` (or your domain) |

4. Click **Deploy**

## Step 5 — Create database tables

After first deploy, run locally (with Neon URL in `.env`):

```powershell
# Temporarily set DATABASE_URL to Neon in .env, then:
npx prisma db push
```

Or use Neon SQL editor — tables are created by `prisma db push`.

## Step 6 — Index knowledge base on production

**Option A — API call (after deploy):**
```powershell
curl -X POST https://raghad-ai.vercel.app/api/rag/index-sample
```

**Option B — Local index into Neon:**
```powershell
# Set DATABASE_URL to Neon in .env
npm run rag:index
```

> On Vercel (Linux), OpenAI SDK works normally — no PowerShell needed.

## Step 7 — Verify

- [ ] Homepage loads with luxury UI
- [ ] View page source → Admitad + Impact meta tags present
- [ ] Register / login works
- [ ] Chat returns AI answers
- [ ] PDF export works

## Step 8 — Send client the link

Share `https://raghad-ai.vercel.app` and ask them to verify affiliate meta tags on Admitad/Impact.

---

## Local dev vs production

| | Local (Windows) | Vercel (Production) |
|--|-----------------|---------------------|
| Database | Neon URL or SQLite* | Neon PostgreSQL |
| OpenAI | PowerShell fallback | Node SDK |
| Index | `npm run rag:index` | `POST /api/rag/index-sample` |

\* For local SQLite, change `provider = "sqlite"` in `prisma/schema.prisma` temporarily.

---

## Troubleshooting

**Auth fails on Vercel** → Check `DATABASE_URL` and run `prisma db push`

**Chat says "not indexed"** → Run `POST /api/rag/index-sample` on production

**Build fails on Prisma** → Ensure `postinstall` runs `prisma generate` (already configured)
