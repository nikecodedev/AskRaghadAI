# Raghad AI — Hostinger Migration & Handoff Task Guide

**Document version:** 1.0  
**Last updated:** July 18, 2026  
**Client:** Saleh (@saloh3535)  
**Domain:** https://askraghadai.com  
**Repository:** `pikachu1001/raghad-ai`  
**Settlement (agreed):** $20 USD upon successful migration + client verification  
**Dispute context:** Milestone 2 disputed; clean handoff required before settlement  

---

## Table of contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Phase 0 — Agreement & scope](#3-phase-0--agreement--scope)
4. [Phase 1 — Client access & information](#4-phase-1--client-access--information)
5. [Phase 2 — Developer preparation](#5-phase-2--developer-preparation)
6. [Phase 3 — Hostinger server setup](#6-phase-3--hostinger-server-setup)
7. [Phase 4 — Database migration](#7-phase-4--database-migration)
8. [Phase 5 — Application deployment](#8-phase-5--application-deployment)
9. [Phase 6 — Domain, Nginx & SSL](#9-phase-6--domain-nginx--ssl)
10. [Phase 7 — Verification & smoke tests](#10-phase-7--verification--smoke-tests)
11. [Phase 8 — Client handover](#11-phase-8--client-handover)
12. [Phase 9 — Settlement & dispute closure](#12-phase-9--settlement--dispute-closure)
13. [Alternative paths](#13-alternative-paths)
14. [Environment variables reference](#14-environment-variables-reference)
15. [Handover checklist (printable)](#15-handover-checklist-printable)
16. [Client message templates](#16-client-message-templates)

---

## 1. Overview

### Goal

Migrate the full Raghad AI application (code, database, static files, configuration) from the current deployment to the **client’s Hostinger account**, make it live on **askraghadai.com**, and hand over full control.

### What “complete migration” includes

| Deliverable | Description |
|-------------|-------------|
| **Application code** | Latest `main` branch deployed and running |
| **PostgreSQL database** | Users, products, conversations, knowledge base data |
| **Static files** | `public/brand/*`, `public/fonts/*`, etc. |
| **Environment config** | Secrets on server (not in Git) |
| **Domain + HTTPS** | Site reachable at `https://askraghadai.com` |
| **Handover documentation** | How to restart, access DB, manage admin |

### Technical requirements

This project uses:

- **Next.js 16** (Node.js application)
- **PostgreSQL** (via Prisma)
- **PM2** or equivalent process manager
- **Nginx** reverse proxy (recommended on VPS)

**Basic Hostinger shared PHP hosting cannot run this app.** A **VPS** or **Node.js-capable** plan is required.

---

## 2. Prerequisites

### From the developer

- [ ] Latest code committed and pushed to GitHub (`main`)
- [ ] Access to current production `.env` values (Neon, OpenAI, auth)
- [ ] Database backup exported from Neon
- [ ] Freelancer agreement on $20 settlement terms (in writing)

### From the client

- [ ] Hostinger **Account Sharing** invitation sent
- [ ] Confirmation of hosting plan type (VPS preferred)
- [ ] Domain `askraghadai.com` on Hostinger account
- [ ] Written confirmation: $20 settlement after live migration verified

---

## 3. Phase 0 — Agreement & scope

**Objective:** Align on deliverables and payment before technical work.

### Tasks

| # | Task | Owner | Done |
|---|------|-------|------|
| 0.1 | Reply on Freelancer accepting $20 settlement upon successful migration | Developer | ☐ |
| 0.2 | Confirm deliverables: code + DB + files + live domain + handover doc | Developer | ☐ |
| 0.3 | Ask client to confirm settlement terms in the same thread | Developer | ☐ |
| 0.4 | Client confirms $20 after migration verified on askraghadai.com | Client | ☐ |
| 0.5 | Do not start server work until Hostinger access is granted | Developer | ☐ |

### Exit criteria

- [ ] Written agreement on scope and $20 settlement exists on Freelancer

---

## 4. Phase 1 — Client access & information

**Objective:** Obtain everything needed to access Hostinger and deploy.

### Tasks

| # | Task | Owner | Done |
|---|------|-------|------|
| 1.1 | Send developer email for Hostinger Account Sharing | Client | ☐ |
| 1.2 | Accept Account Sharing invitation in Hostinger panel | Developer | ☐ |
| 1.3 | Confirm Hostinger plan: VPS / Cloud / shared | Client | ☐ |
| 1.4 | If shared only: request VPS upgrade (explain Node.js requirement) | Developer | ☐ |
| 1.5 | Confirm domain `askraghadai.com` is on this account | Client | ☐ |
| 1.6 | Obtain VPS SSH credentials (IP, username, password or SSH key) | Developer | ☐ |
| 1.7 | Confirm who owns OpenAI API billing after handover | Both | ☐ |

### Information to collect

| Item | Value |
|------|-------|
| Hostinger account email | |
| VPS IP address | |
| SSH username | |
| SSH password / key | |
| Domain registrar / DNS panel access | |
| Client admin email for site | |

### Exit criteria

- [ ] Developer can SSH into VPS (or access Node deploy panel)
- [ ] Domain is manageable from Hostinger

---

## 5. Phase 2 — Developer preparation

**Objective:** Prepare code, secrets, and database backup before touching Hostinger.

### Tasks

| # | Task | Owner | Done |
|---|------|-------|------|
| 2.1 | Verify local repo is clean; push latest `main` to GitHub | Developer | ☐ |
| 2.2 | Note current production commit hash: `git log -1 --oneline` | Developer | ☐ |
| 2.3 | Export PostgreSQL backup from Neon (`pg_dump`) | Developer | ☐ |
| 2.4 | Store backup securely (local encrypted copy) | Developer | ☐ |
| 2.5 | Prepare `.env` template for server (no secrets in chat) | Developer | ☐ |
| 2.6 | Generate new `AUTH_SECRET` for production server | Developer | ☐ |
| 2.7 | List all env vars needed (see [Section 14](#14-environment-variables-reference)) | Developer | ☐ |
| 2.8 | Confirm `NEXT_PUBLIC_APP_URL=https://askraghadai.com` | Developer | ☐ |

### Commands (local — Windows)

```powershell
cd D:\task\freelancer\raghad-ai
git status
git push origin main
git log -1 --oneline
```

### Database export (Neon)

```powershell
# Requires PostgreSQL client tools installed
pg_dump "YOUR_NEON_DATABASE_URL" -F c -f raghad-backup.dump
```

Alternative: use Neon dashboard → Backup / Export → download SQL file.

### Exit criteria

- [ ] GitHub `main` is up to date
- [ ] Database backup file exists and is verified (non-empty)
- [ ] Env template ready for server

---

## 6. Phase 3 — Hostinger server setup

**Objective:** Prepare a clean VPS with Node.js, PostgreSQL, Nginx, and PM2.

> **Applies to:** Hostinger VPS (recommended). Adjust if using another Node-capable plan.

### Tasks

| # | Task | Owner | Done |
|---|------|-------|------|
| 3.1 | SSH into VPS | Developer | ☐ |
| 3.2 | Update system packages | Developer | ☐ |
| 3.3 | Install Node.js 20 LTS | Developer | ☐ |
| 3.4 | Install Git | Developer | ☐ |
| 3.5 | Install PM2 globally | Developer | ☐ |
| 3.6 | Install Nginx | Developer | ☐ |
| 3.7 | Install PostgreSQL server + client tools | Developer | ☐ |
| 3.8 | Configure firewall: allow 22, 80, 443 | Developer | ☐ |
| 3.9 | Create app directory `/var/www/raghad-ai` | Developer | ☐ |

### Commands (VPS — Ubuntu/Debian)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx postgresql postgresql-contrib

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

sudo npm install -g pm2

sudo mkdir -p /var/www
```

### Exit criteria

- [ ] `node -v` shows v20+
- [ ] `pm2 -v` works
- [ ] `nginx -v` works
- [ ] PostgreSQL service is running

---

## 7. Phase 4 — Database migration

**Objective:** Move all data from Neon to Hostinger PostgreSQL.

### Tasks

| # | Task | Owner | Done |
|---|------|-------|------|
| 4.1 | Create PostgreSQL user `raghad` with strong password | Developer | ☐ |
| 4.2 | Create database `raghad` owned by `raghad` | Developer | ☐ |
| 4.3 | Upload backup file to VPS (`scp` or SFTP) | Developer | ☐ |
| 4.4 | Restore backup into Hostinger PostgreSQL | Developer | ☐ |
| 4.5 | Verify tables exist (users, products, conversations, etc.) | Developer | ☐ |
| 4.6 | Run `npx prisma db push` if schema drift detected | Developer | ☐ |
| 4.7 | Run affiliate seed if products missing: `npm run db:seed-affiliates` | Developer | ☐ |
| 4.8 | Record final `DATABASE_URL` for `.env` | Developer | ☐ |

### Commands (VPS)

```bash
sudo -u postgres psql
```

```sql
CREATE USER raghad WITH PASSWORD 'REPLACE_STRONG_PASSWORD';
CREATE DATABASE raghad OWNER raghad;
\q
```

```bash
# For custom format dump:
pg_restore -U raghad -d raghad -h localhost raghad-backup.dump

# For SQL file:
# psql -U raghad -d raghad -h localhost -f raghad-backup.sql
```

### Verification

```bash
psql -U raghad -d raghad -h localhost -c "\dt"
psql -U raghad -d raghad -h localhost -c "SELECT COUNT(*) FROM \"Product\";"
```

### Exit criteria

- [ ] Database restored with expected row counts
- [ ] `DATABASE_URL` tested from app server

---

## 8. Phase 5 — Application deployment

**Objective:** Deploy Next.js app and run it as a persistent service.

### Tasks

| # | Task | Owner | Done |
|---|------|-------|------|
| 5.1 | Clone repo: `git clone https://github.com/pikachu1001/raghad-ai.git` | Developer | ☐ |
| 5.2 | Create `.env` on server with all required variables | Developer | ☐ |
| 5.3 | Run `npm install` | Developer | ☐ |
| 5.4 | Run `npx prisma generate` | Developer | ☐ |
| 5.5 | Run `npm run build` (must exit 0) | Developer | ☐ |
| 5.6 | Start app with PM2: `pm2 start npm --name raghad-ai -- start` | Developer | ☐ |
| 5.7 | Configure PM2 startup on reboot: `pm2 save` + `pm2 startup` | Developer | ☐ |
| 5.8 | Verify app responds on `http://localhost:3000` | Developer | ☐ |
| 5.9 | Check PM2 logs for errors: `pm2 logs raghad-ai` | Developer | ☐ |

### Commands (VPS)

```bash
cd /var/www
git clone https://github.com/pikachu1001/raghad-ai.git
cd raghad-ai
nano .env
npm install
npm run build
pm2 start npm --name raghad-ai -- start
pm2 save
pm2 startup
curl -I http://127.0.0.1:3000
```

### Exit criteria

- [ ] Build succeeds
- [ ] PM2 shows `raghad-ai` as `online`
- [ ] Local curl returns HTTP 200

---

## 9. Phase 6 — Domain, Nginx & SSL

**Objective:** Make the site publicly accessible at `https://askraghadai.com`.

### Tasks

| # | Task | Owner | Done |
|---|------|-------|------|
| 6.1 | Point DNS A record `@` to VPS IP | Client/Developer | ☐ |
| 6.2 | Point DNS A record `www` to VPS IP (optional) | Client/Developer | ☐ |
| 6.3 | Create Nginx site config for askraghadai.com | Developer | ☐ |
| 6.4 | Enable site and reload Nginx | Developer | ☐ |
| 6.5 | Install Certbot and obtain SSL certificate | Developer | ☐ |
| 6.6 | Verify HTTPS loads without certificate warnings | Developer | ☐ |
| 6.7 | Wait for DNS propagation (up to 24–48 hours) | Both | ☐ |
| 6.8 | Disable or document old Vercel deployment (optional) | Developer | ☐ |

### Nginx config path

`/etc/nginx/sites-available/askraghadai.com`

Proxy `https://askraghadai.com` → `http://127.0.0.1:3000`

### SSL

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d askraghadai.com -d www.askraghadai.com
```

### Exit criteria

- [ ] `https://askraghadai.com` loads the app
- [ ] SSL certificate valid (padlock in browser)

---

## 10. Phase 7 — Verification & smoke tests

**Objective:** Confirm basic functionality before handover.

### Tasks

| # | Task | Owner | Done |
|---|------|-------|------|
| 7.1 | Homepage loads (AR default) | Developer | ☐ |
| 7.2 | Language switch AR ↔ EN works | Developer | ☐ |
| 7.3 | Hamburger menu opens; links work | Developer | ☐ |
| 7.4 | Settings (region, language) in drawer work | Developer | ☐ |
| 7.5 | Chat page loads; send test message | Developer | ☐ |
| 7.6 | OpenAI response returns (API key valid) | Developer | ☐ |
| 7.7 | Login / register works | Developer | ☐ |
| 7.8 | About and Contact pages load | Developer | ☐ |
| 7.9 | PDF export works (Arabic test) | Developer | ☐ |
| 7.10 | Admin panel accessible for admin user | Developer | ☐ |
| 7.11 | Product cards appear for relevant queries (optional) | Developer | ☐ |
| 7.12 | Client performs own verification on askraghadai.com | Client | ☐ |

### Smoke test matrix

| Page / feature | Desktop | Mobile | Pass |
|----------------|---------|--------|------|
| Home | ☐ | ☐ | |
| Language switch | ☐ | ☐ | |
| Chat | ☐ | ☐ | |
| Login | ☐ | ☐ | |
| About | ☐ | ☐ | |
| HTTPS | ☐ | ☐ | |

### Exit criteria

- [ ] Developer smoke tests pass
- [ ] Client confirms site is live on his domain

---

## 11. Phase 8 — Client handover

**Objective:** Transfer full operational control to the client.

### Tasks

| # | Task | Owner | Done |
|---|------|-------|------|
| 8.1 | Write handover document (this guide + client-specific credentials) | Developer | ☐ |
| 8.2 | Provide server path: `/var/www/raghad-ai` | Developer | ☐ |
| 8.3 | Provide PM2 commands (restart, logs, status) | Developer | ☐ |
| 8.4 | Provide database access details (Hostinger Postgres) | Developer | ☐ |
| 8.5 | Transfer or grant GitHub repo access to client | Developer | ☐ |
| 8.6 | Confirm admin user email / how to create admin | Developer | ☐ |
| 8.7 | Store secrets in client password manager (not plain email) | Client | ☐ |
| 8.8 | Remove developer Hostinger access if client requests | Developer | ☐ |
| 8.9 | Notify client migration is complete; request verification | Developer | ☐ |

### PM2 reference for client

```bash
pm2 status
pm2 restart raghad-ai
pm2 logs raghad-ai
pm2 stop raghad-ai
```

### Deploy updates (future)

```bash
cd /var/www/raghad-ai
git pull origin main
npm install
npm run build
pm2 restart raghad-ai
```

### Exit criteria

- [ ] Client has hosting, DB, repo, and restart instructions
- [ ] Client confirms basic structure is under his control

---

## 12. Phase 9 — Settlement & dispute closure

**Objective:** Close Freelancer dispute after successful handoff.

### Tasks

| # | Task | Owner | Done |
|---|------|-------|------|
| 9.1 | Client tests site on askraghadai.com | Client | ☐ |
| 9.2 | Client confirms migration complete in Freelancer chat | Client | ☐ |
| 9.3 | Client accepts **$20 settlement** on disputed milestone | Client | ☐ |
| 9.4 | Developer confirms receipt of settlement | Developer | ☐ |
| 9.5 | Dispute marked resolved | Both | ☐ |
| 9.6 | Optional: part on good terms message | Both | ☐ |

### Exit criteria

- [ ] $20 received
- [ ] Dispute closed

---

## 13. Alternative paths

### If client has shared hosting only (no Node.js)

| Step | Action |
|------|--------|
| A.1 | Explain Next.js requires Node.js; shared PHP hosting will not work |
| A.2 | Ask client to upgrade to Hostinger VPS |
| A.3 | Do not attempt migration on incompatible hosting |

### If client prefers to keep database on Neon

| Step | Action |
|------|--------|
| B.1 | Deploy app on Hostinger VPS only |
| B.2 | Set `DATABASE_URL` to Neon connection string in server `.env` |
| B.3 | Transfer Neon project ownership to client |
| B.4 | Document Neon login for client |

### If DNS propagation is slow

| Step | Action |
|------|--------|
| C.1 | Test via VPS IP + `/etc/hosts` temporarily |
| C.2 | Inform client propagation may take up to 48 hours |

---

## 14. Environment variables reference

Create `/var/www/raghad-ai/.env` on the server:

| Variable | Required | Example / notes |
|----------|----------|-----------------|
| `DATABASE_URL` | Yes | `postgresql://raghad:PASSWORD@localhost:5432/raghad` |
| `AUTH_SECRET` | Yes | `openssl rand -hex 32` |
| `OPENAI_API_KEY` | Yes | Client or developer key until handover |
| `ADMIN_EMAIL` | Yes | Client admin email for admin panel access |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://askraghadai.com` |
| `ADMITAD_CLIENT_ID` | No | Phase 3 — optional |
| `ADMITAD_CLIENT_SECRET` | No | Phase 3 — optional |
| `DCM_API_KEY` | No | Phase 3 — optional |
| `TRAVELPAYOUTS_API_TOKEN` | No | Phase 3 — optional |

**Never commit `.env` to Git.**

---

## 15. Handover checklist (printable)

### Developer pre-flight

- [ ] Agreement on $20 settlement documented
- [ ] Hostinger access received
- [ ] VPS confirmed (not shared PHP only)
- [ ] Code pushed to GitHub
- [ ] Database backup exported

### Server deployment

- [ ] Node.js 20+ installed
- [ ] PostgreSQL created and restored
- [ ] App cloned and built
- [ ] PM2 running
- [ ] Nginx configured
- [ ] SSL active

### Client verification

- [ ] https://askraghadai.com loads
- [ ] Login works
- [ ] Chat works
- [ ] Client has Hostinger control
- [ ] Client has DB credentials
- [ ] Client has GitHub access

### Closure

- [ ] Handover doc sent
- [ ] Client accepts $20 settlement
- [ ] Dispute resolved

---

## 16. Client message templates

### Template A — Accept migration + request access

Hi Saleh,

I accept the $20 settlement upon successful migration of the website, database, and files to your Hostinger account, live on askraghadai.com. Once you confirm the site is under your control, I understand you will accept the settlement on Freelancer.

Please send a Hostinger Account Sharing invitation to: **[your email]**

Also confirm:
1. Your plan supports Node.js (VPS recommended for Next.js)
2. askraghadai.com is on this Hostinger account
3. You will accept the $20 settlement after verification

I will begin as soon as access is granted.

Best regards,  
Roman

### Template B — Migration complete

Hi Saleh,

Migration is complete. The site is live at:

**https://askraghadai.com**

I have attached a handover document with server paths, database access, and how to restart the application. Please test login, chat, and language switching on desktop and mobile.

Once you confirm everything is under your control, please accept the $20 settlement as agreed so we can close the dispute.

Best regards,  
Roman

### Template C — VPS required (if shared hosting only)

Hi Saleh,

Thank you for the access. This application is built with Next.js and requires Node.js hosting. Basic shared PHP hosting cannot run it.

To complete the migration on Hostinger, please upgrade to a **VPS plan** (or confirm Node.js hosting). Once upgraded, I can deploy immediately.

Best regards,  
Roman

---

## Appendix — Project reference

| Item | Value |
|------|-------|
| App framework | Next.js 16 |
| Database | PostgreSQL + Prisma |
| Process manager | PM2 |
| Reverse proxy | Nginx |
| Default port | 3000 |
| Repo | `pikachu1001/raghad-ai` |
| Seed affiliates | `npm run db:seed-affiliates` |
| Build | `npm run build` |
| Start | `npm start` (via PM2) |

---

*End of document.*
