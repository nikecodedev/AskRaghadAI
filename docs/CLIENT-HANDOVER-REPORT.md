# Client handover — fixes, database backup, knowledge base

**Site:** https://askraghadai.com  
**Hosting:** Hostinger Cloud Startup (Node.js)  
**Database:** Neon PostgreSQL (external; not on Hostinger)  
**Date:** July 2026  

---

## 1. Smart Assistant / chat issue — investigation

### Symptoms

- User sees **“Chat request failed”** on many queries (fashion, beauty, travel, etc.).
- Simple greetings sometimes worked.

### Root cause

1. **OpenAI API** — Working when `OPENAI_API_KEY` is set in Hostinger **Environment variables**. Simple chat paths that only call OpenAI succeed.
2. **Database** — When the user’s message matches a product category (e.g. abaya, perfume, travel), the chat API loads affiliate **products** from PostgreSQL via Prisma. If `DATABASE_URL` is missing, wrong, or Neon is unreachable from Hostinger, that query **throws** and the whole request returned **500** with `"Chat request failed"`.

So this was **not** an OpenAI-only failure; it was **database connectivity / configuration** on category-related messages.

### Code fix (included in latest source)

The chat API now **catches product/database errors** and still returns the AI answer (product cards may be empty until the DB is fixed). After redeploy, users should get answers instead of a hard failure.

**File changed:** `src/app/api/chat/route.ts`

### What you must do on Hostinger (required for full features)

1. hPanel → **askraghadai.com** → **Environment variables**
2. Confirm **`DATABASE_URL`** is set (one line, no extra quotes), for example:

   ```text
   postgresql://USER:PASSWORD@ep-....neon.tech/neondb?sslmode=require
   ```

3. Confirm **`OPENAI_API_KEY`** is valid and billed.
4. **Redeploy** after any env change (Deployments → **Redeploy**).
5. In [Neon console](https://console.neon.tech): project **active**, password matches `DATABASE_URL`. Prefer **pooled** connection string for server hosting.

### Verify after redeploy

- Send a category question (e.g. abaya or perfume) — you should get an **answer** (not “Chat request failed”).
- If products still missing, fix `DATABASE_URL` and run affiliate seed (see below).

---

## 2. Full source code (zip)

From the project root on your machine:

```powershell
cd D:\task\freelancer\raghad-ai
git archive --format=zip --output ..\raghad-ai-source.zip HEAD
```

Deliver **`raghad-ai-source.zip`** to the client.  
**GitHub:** transfer repository ownership to the client’s GitHub username when they provide it.

---

## 3. Database backup (full SQL export)

Requires PostgreSQL client tools (`pg_dump`) and the Neon connection string.

```powershell
pg_dump "YOUR_DATABASE_URL" -F p -f raghad-ai-backup.sql
```

Or in Neon: project → **Backup / Export** → download SQL.

**Hand to client:** `raghad-ai-backup.sql` + note that restore is into any PostgreSQL (Neon recommended).

**Security:** Send backup and secrets via a private channel, not Freelancer chat.

---

## 4. Knowledge base — how the client manages it

### Admin panel (recommended)

1. Log in at https://askraghadai.com/login (email must match **`ADMIN_EMAIL`** in env).
2. Open **Admin** → **Knowledge base** (`/admin/knowledge`).
3. **Add document:** title, category, paste text content → save.
4. Click **Re-index** so embeddings are rebuilt and chat uses the new content.

Requires **`OPENAI_API_KEY`** and working **`DATABASE_URL`**.

### Developer / CLI (optional)

See **`docs/KNOWLEDGE_BASE.md`**:

- Edit files under `sample-data/`
- Run `npm run rag:index` locally against production `DATABASE_URL`, or use admin re-index on production.

### Dialect / synonyms

Edit `src/lib/rag/dialect.ts` for Gulf Arabic terms, redeploy.

---

## 5. Affiliate products (chat cards)

If the DB works but product cards are empty:

```powershell
cd raghad-ai
npm run db:seed-affiliates
```

(Run with production `DATABASE_URL` in `.env`, or add products via `/admin/products`.)

---

## 6. Environment variables checklist (Hostinger)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL |
| `OPENAI_API_KEY` | Smart Assistant |
| `AUTH_SECRET` | Login sessions |
| `ADMIN_EMAIL` | Admin panel access |
| `NEXT_PUBLIC_APP_URL` | `https://askraghadai.com` |

---

## 7. Suggested reply to client (Freelancer)

> Hi Saleh,  
>  
> I investigated the Smart Assistant error. OpenAI is connected; the failures were triggered when the app queried the PostgreSQL database for product recommendations. I have fixed the code so chat returns AI answers even if the database hiccups, and documented the required Hostinger `DATABASE_URL` setup.  
>  
> I am sending: (1) full source code zip, (2) database SQL backup, (3) this handover report including Knowledge Base instructions via Admin → Knowledge.  
>  
> Please redeploy once env vars are confirmed, test chat with a fashion/beauty question, and share your GitHub username for repo transfer.  
>  
> Best regards,  
> Roman  

---

## 8. Post-fix deploy on Hostinger

1. Push latest code to GitHub **or** upload new zip.
2. **Redeploy** from Deployments.
3. Test https://askraghadai.com/chat.
