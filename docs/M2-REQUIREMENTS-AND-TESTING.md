# Raghad AI (askraghadai.com) — Client Requirements, Implementation & Testing Guide

**Document version:** 1.0  
**Last updated:** July 10, 2026  
**Client:** Saleh (@saloh3535)  
**Site:** https://askraghadai.com  
**Repository:** `pikachu1001/raghad-ai`  
**Budget (agreed):** $100 fixed — Milestone 1 ($50) + Milestone 2 ($50)

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Scope boundaries](#2-scope-boundaries)
3. [Original project requirements](#3-original-project-requirements)
4. [Milestone 1 — delivered & approved](#4-milestone-1--delivered--approved)
5. [Milestone 2 — agreed scope](#5-milestone-2--agreed-scope)
6. [Phase 3 — out of M2 scope (separate estimate)](#6-phase-3--out-of-m2-scope-separate-estimate)
7. [Client feedback history (consolidated)](#7-client-feedback-history-consolidated)
8. [Current critical blockers (Jul 10 rejection)](#8-current-critical-blockers-jul-10-rejection)
9. [Detailed requirements specification](#9-detailed-requirements-specification)
10. [Implementation plan](#10-implementation-plan)
11. [File reference map](#11-file-reference-map)
12. [Testing procedures](#12-testing-procedures)
13. [Acceptance criteria](#13-acceptance-criteria)
14. [Deployment checklist](#14-deployment-checklist)
15. [Pending client deliverables](#15-pending-client-deliverables)
16. [Recommended work order & timeline](#16-recommended-work-order--timeline)

---

## 1. Executive summary

Raghad AI is a bilingual (Arabic/English) luxury lifestyle AI assistant for KSA, GCC, and Egypt. The client has **approved Milestone 1** and **rejected the current Milestone 2 build** (July 10, 2026) due to **critical system-wide RTL/LTR failures**, localization quality issues, AI tone problems, PDF corruption, and typography/spacing concerns.

The client explicitly requested:
- A **holistic, system-wide fix** — not per-element patches
- **One consolidated delivery** for re-review (he will not re-test partial fixes repeatedly)
- **Professional quality** matching a luxury brand standard

This document consolidates **all requirements** from the original brief, agreed M2 scope, every client note in chat history, and the latest rejection — plus **how to implement and test each item**.

---

## 2. Scope boundaries

| Phase | Budget | Status | Includes |
|-------|--------|--------|----------|
| **Milestone 1** | $50 | ✅ Approved & paid | Core AI chat, RAG pipeline, auth, dashboard skeleton, PDF export (basic), deployment, bilingual UI foundation |
| **Milestone 2** | $50 | ❌ Rejected — fixes required | Luxury UI, logo fix, Arabic/EN localization, central search, product cards in chat, basic admin (products + KB), About/Contact pages, affiliate link integration, navigation fixes |
| **Phase 3** | TBD (separate quote) | Not started | Analytics dashboard, multi-network affiliate automation, trend engine, backups, social/email automation, broken-link checker, image optimization, seasonal triggers, admin video tutorial |

**Important:** Client originally listed automation features under "Phase 2" but **agreed in writing** (Jul 7) that M2 = core only; Phase 3 = automation estimate separately.

---

## 3. Original project requirements

*Source: `requirement.md`*

### 3.1 Dynamic UI/UX & localization
- Clean, responsive design (desktop + mobile)
- Full bilingual support (Arabic + English)
- Multi-currency and localized dialect by country (KSA, GCC, Egypt)
- Dedicated product/service cards section

### 3.2 AI integration & knowledge base
- OpenAI API integration (GPT-4o mini)
- Advanced RAG with OpenAI Embeddings
- Custom knowledge base for domain-specific answers

### 3.3 Core utilities
- PDF export of conversation summaries (clean, formatted)
- Secured user dashboard + backend database

### 3.4 Deliverables
- Fully functional web app with clean code
- Cloud deployment (Vercel)
- Brief documentation for updating RAG knowledge base

### 3.5 Design identity (client assets)
- **Palette:** Cream/Champagne, Gold, Emerald
- **Style:** Luxury, minimalist, high-end
- **Logo:** Floral emblem — transparent background (no black frame)
- **Homepage:** Central search bar as primary UX element
- **Interactive icons:** Payment, Voice, Camera (clickable)
- **Background:** Subtle compass watermark, consistent across pages
- **6 categories:** Fashion & Abayas, Beauty & Scents, Skincare, Home Decor & Kitchen, Kids & Baby Essentials, Smart Travel Planning

---

## 4. Milestone 1 — delivered & approved

Client confirmed (Jul 5–6):
- Core AI functionality works (recommendations, affiliate links in text form)
- Register/login functional
- Chat in EN/AR
- PDF export button present
- Admitad + Impact meta tags in `<head>`
- MVP deployed at askraghadai.com

**M1 payment released.**

---

## 5. Milestone 2 — agreed scope

*Agreed Jul 7 between client and developer:*

| # | Deliverable | Description |
|---|-------------|-------------|
| 1 | **Luxury UI** | Match design reference (63092.png / client screenshots); cream/gold/emerald palette |
| 2 | **Logo fix** | Transparent logos, no black borders; correct assets on mobile/desktop |
| 3 | **Arabic localization** | Default Arabic, professional EN/AR copy, gender-neutral Arabic where applicable |
| 4 | **Central search bar** | Prominent on homepage across devices; Arabic placeholder "ابحث" on mobile |
| 5 | **Product cards in chat** | Visual cards with images, prices, "Shop now" CTA — max 2 per response; no raw URLs |
| 6 | **Basic admin panel** | Manage categories, products, affiliate URLs/discount codes, KB upload/re-index |
| 7 | **About Us page** | Vision + Mission sections, luxury layout |
| 8 | **Contact Us page** | Contact form, luxury layout |
| 9 | **Navigation** | Working hamburger menu (mobile + desktop) |
| 10 | **Affiliate link integration** | Client's affiliate links loaded into product system |
| 11 | **AI fallback UX** | Professional category guidance when AI cannot answer |
| 12 | **Settings (region/currency/language)** | Consolidated settings menu, geolocation + manual override, mobile region selector |
| 13 | **Login/dashboard polish** | Auth fixes, saved conversations, middleware protection |
| 14 | **Layout refinements** | Tighter homepage spacing, home icon on sub-pages, professional footer |

---

## 6. Phase 3 — out of M2 scope (separate estimate)

*Client requested; developer scoped separately — NOT required for M2 approval:*

- Admin analytics dashboard (revenue, affiliate performance)
- Universal multi-network affiliate engine (Admitad, Amazon, Noon, etc.)
- AI SEO copy generation + smart auto-comparison
- Self-optimizing product catalog (archive low performers)
- Trend-predictive engine
- Automated daily DB/file backups
- Error reporting (email/Telegram alerts)
- Broken affiliate link checker (daily scan)
- Automated image optimization (WebP)
- Social media auto-posting + email capture
- Seasonal triggers (Ramadan, National Day)
- Admin dashboard video tutorial
- Google Analytics
- AI response streaming

---

## 7. Client feedback history (consolidated)

### 7.1 First M2 review (Jul 7)

| Area | Requirement |
|------|-------------|
| UI | Add "ابحث" placeholder in search box |
| UI | Reduce vertical spacing between search and "Our Categories" |
| UI | Overall design still too basic — needs luxury feel |
| Settings | Single Settings menu: Country/Region + Currency + Language |
| Settings | Country selection missing on mobile |
| Settings | Auto geolocation with manual override |
| AI | Professional fallback when request unsupported |
| AI | Links as buttons/CTA, not raw URLs |
| Admin | Full demo of products + KB management |
| Logo | Update per agreement |
| Nav | Fix non-functional hamburger menu |
| Pages | About Us (Vision/Mission) + Contact Us |
| Affiliate | Integrate affiliate network links (client to send) |

### 7.2 Client testing note (Jul 9)

- Client busy; will test M2 later
- Asked developer to align with original requirements before feedback

### 7.3 M2 rejection — critical issues (Jul 10)

Client message summary: **Cannot approve current progress.** Requires system-wide fixes in one pass.

#### Blocker 1 — RTL/LTR direction engine
- Logo position static; does not adjust for mobile/web or language
- Logo must shift with direction: **RTL = right (Arabic), LTR = left (English)**
- Switching AR → EN leaves UI stuck in RTL (menu, text, logo)
- **Holistic direction engine required** — patching individual elements is not acceptable

#### Blocker 2 — Localization standards
- Current localization reflects unprofessional quality
- **Active state** needed on language selector (user must see which language is selected)

#### Blocker 3 — AI assistant & content
- AI uses **feminine Arabic conjugations** (e.g. تأكدي, احجزي) — must be **gender-neutral / masculine-default**
- **Arabic punctuation** (brackets, colons) rendered at wrong line positions in chat (RTL bidi errors)
- **Mobile chat input font size** too small

#### Blocker 4 — PDF & typography
- PDF export produces **mojibake** (garbled Arabic) — needs UTF-8 + embedded Unicode Arabic fonts
- Font weight too thin, contrast too low site-wide
- Sections like About Us are crowded — need more whitespace, heavier weight, better contrast

---

## 8. Current critical blockers (Jul 10 rejection)

| ID | Blocker | Severity | Root cause (codebase) |
|----|---------|----------|------------------------|
| B1 | RTL/LTR not switching system-wide | 🔴 Critical | `layout.tsx` hardcodes `dir="rtl" lang="ar"`; client-only update in `AppProviders`; `LuxuryHome.tsx` has forced `dir="ltr"` sub-regions |
| B2 | Logo not direction-aware | 🔴 Critical | `BrandLockup` always uses English asset; home uses separate header logic; physical `left`/`right` CSS |
| B3 | No language active indicator | 🟠 High | `LanguageToggle.tsx` toggles only; no highlighted active locale |
| B4 | Feminine Arabic in AI | 🔴 Critical | `openai-rag.ts` system prompt uses أنتِ, قدّمي, etc.; `fallback.ts` uses سؤالكِ, اخترِي |
| B5 | Arabic punctuation in chat | 🔴 Critical | No bidi isolation in `ChatMessageContent` / `markdown/render.tsx` |
| B6 | Mobile chat input too small | 🟡 Medium | `ChatPanel.tsx` uses `text-sm` (14px) on all breakpoints |
| B7 | PDF Arabic corruption | 🔴 Critical | `ChatPanel.tsx` uses jsPDF default Helvetica (Latin-1 only) |
| B8 | Thin typography / low contrast | 🟠 High | Widespread `text-sm`, muted colors `#7a8b82`, `#5c6b62` |
| B9 | About Us crowding | 🟡 Medium | Tight spacing in `about/page.tsx` |
| B10 | Settings menu incomplete | 🟠 High | Region/currency UI not exposed in header/mobile nav (backend `/api/geo` exists) |
| B11 | Affiliate links pending | 🟠 High | Client links in `afflicate links.md`; seed script exists but full integration unverified |

---

## 9. Detailed requirements specification

### 9.1 Direction engine (RTL/LTR) — REQ-DIR

| Req ID | Requirement | Acceptance standard |
|--------|-------------|---------------------|
| REQ-DIR-01 | Single source of truth for `dir` and `lang` | `html` element reflects active locale on first paint (no flash) |
| REQ-DIR-02 | All pages respect direction | Home, Chat, About, Contact, Login, Dashboard, Admin |
| REQ-DIR-03 | Logical CSS properties | Use `start`/`end`, `ms`/`me`, `ps`/`pe` — not hardcoded `left`/`right` for layout |
| REQ-DIR-04 | No forced LTR overrides | Remove `dir="ltr"` hacks that break Arabic layout |
| REQ-DIR-05 | Language switch is instant & complete | Menu, logo, text alignment, forms, chat bubbles all flip |
| REQ-DIR-06 | SSR/hydration safe | Cookie or middleware sets locale before render |

**Implementation approach:**
1. Store locale in cookie (`raghad-locale`) via middleware
2. Read cookie in `layout.tsx` to set initial `html lang` and `dir`
3. `AppProviders` syncs cookie on `setLocale`
4. Add `dir={dir}` to every page root and form inputs
5. Refactor `LuxuryHome.tsx` to use shared header/branding components
6. Replace physical positioning with logical properties in CSS

---

### 9.2 Logo & branding — REQ-BRAND

| Req ID | Requirement | Acceptance standard |
|--------|-------------|---------------------|
| REQ-BRAND-01 | Transparent logos only | No black frames/borders |
| REQ-BRAND-02 | Locale-aware logo assets | Arabic layout uses appropriate lockup/mark |
| REQ-BRAND-03 | Logo follows direction | RTL: logo at **start** (visually right); LTR: logo at **start** (visually left) |
| REQ-BRAND-04 | Consistent across pages | Same branding logic on home and inner pages |
| REQ-BRAND-05 | Mobile vs desktop assets | Correct assets per breakpoint (per client design refs) |

**Assets in `public/brand/`:**
- `mark.png`, `logo.png`, `logo-web.png`, `raghad-web.png`, `wordmark.png`, `lockup.png`, `right-text.png`, `tagline-ar.png`

**Implementation approach:**
1. Extend `BrandLogo.tsx` / `BrandLockup` with `locale` and `dir` props
2. Map locale → asset paths centrally
3. Unify `LuxuryHome` header with `Header.tsx` or shared `SiteHeader` component

---

### 9.3 Localization — REQ-I18N

| Req ID | Requirement | Acceptance standard |
|--------|-------------|---------------------|
| REQ-I18N-01 | Arabic default | First visit defaults to AR unless saved preference |
| REQ-I18N-02 | English fully LTR | No RTL leakage in EN mode |
| REQ-I18N-03 | Language active state | Selected language visually highlighted (header + mobile drawer) |
| REQ-I18N-04 | All UI strings from i18n files | No hardcoded hero copy in components |
| REQ-I18N-05 | Gender-neutral Arabic UI | No feminine imperatives in `ar.json` (استكشف، اكتب، تصفح) |
| REQ-I18N-06 | Professional copy quality | Natural Arabic and English; no machine-translated tone |

**Files:** `src/messages/ar.json`, `src/messages/en.json`

---

### 9.4 Settings (region, currency, language) — REQ-SETTINGS

| Req ID | Requirement | Acceptance standard |
|--------|-------------|---------------------|
| REQ-SETTINGS-01 | Consolidated Settings UI | One menu: Region, Currency (derived), Language |
| REQ-SETTINGS-02 | Mobile region selector | Available in mobile nav/settings |
| REQ-SETTINGS-03 | Geolocation auto-detect | `/api/geo` detects country → region (KSA/GCC/Egypt) |
| REQ-SETTINGS-04 | Manual override | User can change region; preference persisted |
| REQ-SETTINGS-05 | Currency follows region | SAR / AED / EGP per `REGION_CONFIG` |

**Regions:** `ksa`, `gcc`, `egypt` — see `src/lib/region/config.ts`

---

### 9.5 Homepage & luxury UI — REQ-UI

| Req ID | Requirement | Acceptance standard |
|--------|-------------|---------------------|
| REQ-UI-01 | Central search bar | Primary hero element on all devices |
| REQ-UI-02 | Arabic search placeholder | "ابحث" visible on Arabic mobile search |
| REQ-UI-03 | Balanced spacing | No excessive gap between search and categories |
| REQ-UI-04 | Cream/gold/emerald palette | Consistent across all pages |
| REQ-UI-05 | Category cards | 6 categories with Explore CTA |
| REQ-UI-06 | Voice/camera/upload icons | Functional on homepage search |
| REQ-UI-07 | FAQ section | Expandable, bilingual |
| REQ-UI-08 | Professional footer | Legal/note text, nav links |
| REQ-UI-09 | Typography | Readable weight and contrast (post Jul 10 fix) |
| REQ-UI-10 | Whitespace | Adequate padding on About, Contact, cards |

---

### 9.6 Navigation — REQ-NAV

| Req ID | Requirement | Acceptance standard |
|--------|-------------|---------------------|
| REQ-NAV-01 | Hamburger menu works | Opens/closes on mobile; overlay + links |
| REQ-NAV-02 | Home icon on sub-pages | Returns to homepage |
| REQ-NAV-03 | Dashboard link when logged in | Hidden when guest |
| REQ-NAV-04 | Admin link when admin | Role-gated |
| REQ-NAV-05 | Escape key closes menu | Accessibility |
| REQ-NAV-06 | Body scroll lock when open | No background scroll |

**File:** `src/components/layout/MobileNav.tsx`, `Header.tsx`

---

### 9.7 AI chat — REQ-CHAT

| Req ID | Requirement | Acceptance standard |
|--------|-------------|---------------------|
| REQ-CHAT-01 | Real OpenAI responses | GPT-4o mini via RAG pipeline |
| REQ-CHAT-02 | Gender-neutral Arabic AI | No تأكدي, احجزي, سؤالكِ in responses |
| REQ-CHAT-03 | Professional fallback | Category list when KB insufficient |
| REQ-CHAT-04 | No raw URLs in text | Links only via product cards / CTA buttons |
| REQ-CHAT-05 | Markdown formatting | Bold, bullets, headings render correctly |
| REQ-CHAT-06 | RTL punctuation correct | Brackets, colons, numbers in correct visual order |
| REQ-CHAT-07 | Apostrophe encoding | Here's not Here??s (Windows UTF-8 fix) |
| REQ-CHAT-08 | Mobile input font ≥16px | Prevents iOS zoom; readable on mobile |
| REQ-CHAT-09 | Mobile keyboard UX | Input stays visible when keyboard open |
| REQ-CHAT-10 | Max 2 product cards | Per chat response |
| REQ-CHAT-11 | Shop now CTA | Opens affiliate URL in new tab |
| REQ-CHAT-12 | Voice input | Where browser supports |
| REQ-CHAT-13 | Image upload | Vision analysis when image attached |
| REQ-CHAT-14 | Welcome message | Bilingual, gender-neutral |

**Files:** `src/lib/rag/openai-rag.ts`, `src/lib/chat/fallback.ts`, `src/components/chat/ChatPanel.tsx`, `src/components/chat/ChatMessageContent.tsx`, `src/lib/markdown/render.tsx`

---

### 9.8 Product cards & affiliates — REQ-AFFILIATE

| Req ID | Requirement | Acceptance standard |
|--------|-------------|---------------------|
| REQ-AFF-01 | Client affiliate links in DB | All links from client spreadsheet loaded |
| REQ-AFF-02 | Category mapping | Travel, Fashion, Beauty, Skincare, Home, General |
| REQ-AFF-03 | Discount codes stored | Namshi NM408, Vogacloset MIV22, etc. |
| REQ-AFF-04 | Admin can edit links | Without code changes |
| REQ-AFF-05 | Admitad meta tag | Present in `<head>` |
| REQ-AFF-06 | Impact meta tag | Present in `<head>` (value + content attributes) |
| REQ-AFF-07 | Cards show image/price | Fallback image if none |

**Data source:** `afflicate links.md`, `scripts/affiliate-products.ts`, `scripts/seed-affiliate-products.ts`

**Run seed:**
```powershell
cd D:\task\freelancer\raghad-ai
npx tsx scripts/seed-affiliate-products.ts
```

---

### 9.9 PDF export — REQ-PDF

| Req ID | Requirement | Acceptance standard |
|--------|-------------|---------------------|
| REQ-PDF-01 | Export button on chat page | Downloads PDF file |
| REQ-PDF-02 | Arabic renders correctly | No mojibake/garbled glyphs |
| REQ-PDF-03 | UTF-8 encoding | Proper character encoding |
| REQ-PDF-04 | Embedded Arabic font | e.g. Noto Sans Arabic subset |
| REQ-PDF-05 | RTL layout in PDF | Arabic conversations read right-to-left |
| REQ-PDF-06 | Locale labels | User/AI headers in active language |
| REQ-PDF-07 | Readable formatting | Title, spacing, line breaks |

**Current gap:** jsPDF + Helvetica only — must embed Unicode Arabic font or switch library.

---

### 9.10 Auth & dashboard — REQ-AUTH

| Req ID | Requirement | Acceptance standard |
|--------|-------------|---------------------|
| REQ-AUTH-01 | Register / login | Email + password |
| REQ-AUTH-02 | Session persistence | Cookie-based JWT |
| REQ-AUTH-03 | Middleware protection | `/dashboard` requires login |
| REQ-AUTH-04 | Redirect if logged in | `/login` → dashboard when session exists |
| REQ-AUTH-05 | Saved conversations | Chat while logged in → appears on dashboard |
| REQ-AUTH-06 | Clear error messages | Bilingual auth errors |
| REQ-AUTH-07 | No duplicate CTAs | Single "Start chatting" on dashboard |

**Files:** `src/middleware.ts`, `src/app/api/auth/*`, `src/app/dashboard/page.tsx`, `src/lib/chat/persist.ts`

---

### 9.11 Admin panel — REQ-ADMIN

| Req ID | Requirement | Acceptance standard |
|--------|-------------|---------------------|
| REQ-ADMIN-01 | Products CRUD | Add/edit/delete affiliate products |
| REQ-ADMIN-02 | Knowledge base upload | Upload docs for RAG indexing |
| REQ-ADMIN-03 | Re-index trigger | KB changes reflected in AI |
| REQ-ADMIN-04 | Admin-only access | Role check |
| REQ-ADMIN-05 | Client demo ready | Walkthrough document or video |

**Routes:** `/admin`, `/admin/products`, `/admin/knowledge`

---

### 9.12 Static pages — REQ-PAGES

| Req ID | Requirement | Acceptance standard |
|--------|-------------|---------------------|
| REQ-PAGES-01 | About Us | Title, subtitle, Vision, Mission |
| REQ-PAGES-02 | Contact Us | Form with name, email, message |
| REQ-PAGES-03 | Luxury layout | Matches site aesthetic |
| REQ-PAGES-04 | Bilingual | All copy from i18n |
| REQ-PAGES-05 | RTL/LTR correct | Per active locale |

---

## 10. Implementation plan

### Phase A — Direction engine (Priority 1)

**Estimated effort:** 1–1.5 days

| Step | Task | Files |
|------|------|-------|
| A1 | Add locale cookie in middleware | `src/middleware.ts` (new/extend) |
| A2 | Dynamic `html lang/dir` from cookie | `src/app/layout.tsx` |
| A3 | Remove hardcoded `dir="ltr"` in home | `src/components/home/LuxuryHome.tsx` |
| A4 | Logical CSS audit | `globals.css`, all layout components |
| A5 | `dir={dir}` on all pages | `login`, `dashboard`, `admin`, `ServiceCardsSection`, forms |
| A6 | Unified header component | New `SiteHeader.tsx` or merge Header + LuxuryHome header |
| A7 | Locale-aware branding | `src/components/brand/BrandLogo.tsx` |

**Verification:** Switch EN on every page — nothing remains RTL-aligned.

---

### Phase B — Localization & language UI (Priority 2)

**Estimated effort:** 0.5 day

| Step | Task | Files |
|------|------|-------|
| B1 | Active state on language toggle | `LanguageToggle.tsx`, `MobileNav.tsx` |
| B2 | Settings panel (region + language) | New `SettingsMenu.tsx` in header + mobile |
| B3 | Wire region selector to `setRegion` | `AppProviders.tsx`, `region/config.ts` |
| B4 | Replace hardcoded hero strings | `LuxuryHome.tsx` → use `messages.hero.*` |
| B5 | Arabic copy audit | `ar.json` — neutral imperatives |

---

### Phase C — AI prompts & chat RTL (Priority 3)

**Estimated effort:** 1 day

| Step | Task | Files |
|------|------|-------|
| C1 | Rewrite Arabic system prompt (neutral) | `openai-rag.ts` |
| C2 | Rewrite fallback messages | `fallback.ts` |
| C3 | Fix vision/error Arabic strings | `openai-rag.ts` |
| C4 | Bidi fix on message content | `ChatMessageContent.tsx`, `markdown/render.tsx` |
| C5 | Mobile input `text-base` (16px) | `ChatPanel.tsx` |
| C6 | Confirm `normalizeAnswerText` in pipeline | `fallback.ts` (done) |

**Arabic prompt guidelines:**
- Use: أنت، قدم، استخدم، اكتب، تصفح، سؤالك، سأساعدك
- Avoid: أنتِ، قدّمي، استخدمي، اكتبي، سؤالكِ، اخترِي

---

### Phase D — PDF Arabic support (Priority 4)

**Estimated effort:** 1 day

| Step | Task | Files |
|------|------|-------|
| D1 | Add Noto Sans Arabic font file | `public/fonts/NotoSansArabic-Regular.ttf` |
| D2 | Register font with jsPDF OR use `@react-pdf/renderer` | New `src/lib/pdf/export-chat.ts` |
| D3 | RTL text layout in PDF | PDF generation module |
| D4 | Locale-aware labels | Use `messages` for User/AI headers |
| D5 | Test with mixed AR/EN conversation | Manual + automated check |

---

### Phase E — Typography & spacing (Priority 5)

**Estimated effort:** 0.5 day

| Step | Task | Files |
|------|------|-------|
| E1 | Increase body font size | `globals.css` |
| E2 | Darken muted text colors | Theme tokens in CSS |
| E3 | Font weight bump | Headings + body |
| E4 | About Us spacing | `about/page.tsx` |
| E5 | Global section padding audit | All page components |

---

### Phase F — Affiliate integration (Priority 6)

**Estimated effort:** 0.5 day

| Step | Task | Files |
|------|------|-------|
| F1 | Verify `affiliate-products.ts` matches client sheet | `scripts/` |
| F2 | Run seed against production DB | `seed-affiliate-products.ts` |
| F3 | Test product cards per category | Chat queries per category |
| F4 | Verify discount codes display | Product cards |

---

## 11. File reference map

| Area | Primary files |
|------|---------------|
| Root layout / SSR dir | `src/app/layout.tsx` |
| Locale state | `src/components/providers/AppProviders.tsx` |
| Middleware / auth | `src/middleware.ts` |
| i18n strings | `src/messages/ar.json`, `src/messages/en.json` |
| Homepage | `src/components/home/LuxuryHome.tsx` |
| Header / nav | `src/components/layout/Header.tsx`, `MobileNav.tsx`, `LanguageToggle.tsx` |
| Brand assets | `src/components/brand/BrandLogo.tsx`, `public/brand/*` |
| Chat UI | `src/components/chat/ChatPanel.tsx`, `ChatMessageContent.tsx`, `ChatProductCard.tsx` |
| Markdown | `src/lib/markdown/render.tsx` |
| AI / RAG | `src/lib/rag/openai-rag.ts`, `src/app/api/chat/route.ts` |
| Fallbacks | `src/lib/chat/fallback.ts` |
| Text normalize | `src/lib/text/normalize.ts` |
| PDF | `ChatPanel.tsx` → extract to `src/lib/pdf/` |
| Region / geo | `src/lib/region/config.ts`, `src/lib/region/geo.ts`, `src/app/api/geo/route.ts` |
| Auth | `src/app/api/auth/*`, `src/app/login/page.tsx` |
| Dashboard | `src/app/dashboard/page.tsx`, `src/lib/chat/persist.ts` |
| Admin | `src/app/admin/*`, `src/app/api/admin/*` |
| About / Contact | `src/app/about/page.tsx`, `src/app/contact/page.tsx` |
| Products | `src/lib/products/store.ts`, `scripts/seed-affiliate-products.ts` |
| Global styles | `src/app/globals.css` |

---

## 12. Testing procedures

### 12.1 Test environment setup

```powershell
cd D:\task\freelancer\raghad-ai
npm install
npm run dev          # http://localhost:3000
npm run build        # Must pass before deploy
```

**Required env vars (`.env`):**
- `DATABASE_URL`
- `AUTH_SECRET`
- `OPENAI_API_KEY`

**Browser setup:**
- Chrome DevTools → Toggle device toolbar (mobile tests)
- Test viewports: 375px (mobile), 768px (tablet), 1280px (desktop)
- Clear localStorage between locale tests OR use incognito per language

---

### 12.2 Master test matrix

Test **every cell** before notifying client:

| Page | AR Mobile | AR Desktop | EN Mobile | EN Desktop |
|------|-----------|------------|-----------|------------|
| Home `/` | ☐ | ☐ | ☐ | ☐ |
| Chat `/chat` | ☐ | ☐ | ☐ | ☐ |
| About `/about` | ☐ | ☐ | ☐ | ☐ |
| Contact `/contact` | ☐ | ☐ | ☐ | ☐ |
| Login `/login` | ☐ | ☐ | ☐ | ☐ |
| Dashboard `/dashboard` | ☐ | ☐ | ☐ | ☐ |
| Admin `/admin` | ☐ | ☐ | ☐ | ☐ |

**Per cell, verify:**
1. Logo at correct side for direction
2. Menu alignment matches direction
3. Text alignment natural for language
4. No RTL artifacts in EN mode
5. Language indicator shows active locale

---

### 12.3 Test case: Direction engine (TC-DIR)

| Step | Action | Expected result | Pass |
|------|--------|-----------------|------|
| TC-DIR-01 | Open site fresh (incognito) | Default Arabic, RTL layout | ☐ |
| TC-DIR-02 | Switch to English | Full LTR: logo left, menu LTR, text left-aligned | ☐ |
| TC-DIR-03 | Switch back to Arabic | Full RTL restored | ☐ |
| TC-DIR-04 | Set EN, navigate Home → Chat → About | LTR on all pages | ☐ |
| TC-DIR-05 | Set AR, navigate all pages | RTL on all pages | ☐ |
| TC-DIR-06 | Refresh page in EN | No RTL flash on load | ☐ |
| TC-DIR-07 | Mobile: toggle language on home | Header + hero flip correctly | ☐ |
| TC-DIR-08 | Mobile: toggle language in chat | Input + bubbles flip correctly | ☐ |

---

### 12.4 Test case: Logo & branding (TC-BRAND)

| Step | Action | Expected result | Pass |
|------|--------|-----------------|------|
| TC-BRAND-01 | Inspect logo on home (AR desktop) | Correct asset, no black border | ☐ |
| TC-BRAND-02 | Inspect logo on home (EN desktop) | Correct asset for English | ☐ |
| TC-BRAND-03 | Inspect logo on chat page | Consistent with direction | ☐ |
| TC-BRAND-04 | Compare mobile vs desktop | Appropriate asset per breakpoint | ☐ |
| TC-BRAND-05 | AR: logo visually on right | RTL start side | ☐ |
| TC-BRAND-06 | EN: logo visually on left | LTR start side | ☐ |

---

### 12.5 Test case: Language indicator (TC-LANG)

| Step | Action | Expected result | Pass |
|------|--------|-----------------|------|
| TC-LANG-01 | View header in Arabic mode | Arabic (ع) or AR visibly active/highlighted | ☐ |
| TC-LANG-02 | Switch to English | English (EN) visibly active/highlighted | ☐ |
| TC-LANG-03 | Open mobile menu | Language section shows active state | ☐ |

---

### 12.6 Test case: Settings & region (TC-SETTINGS)

| Step | Action | Expected result | Pass |
|------|--------|-----------------|------|
| TC-SETTINGS-01 | Open Settings on desktop | Region + Language visible | ☐ |
| TC-SETTINGS-02 | Open Settings on mobile | Same options available | ☐ |
| TC-SETTINGS-03 | First visit geolocation | Region auto-set (if detectable) | ☐ |
| TC-SETTINGS-04 | Manually change to GCC | Currency shows AED | ☐ |
| TC-SETTINGS-05 | Change to Egypt | Currency shows EGP | ☐ |
| TC-SETTINGS-06 | Refresh after manual change | Preference persisted | ☐ |

---

### 12.7 Test case: AI chat (TC-CHAT)

| Step | Action | Expected result | Pass |
|------|--------|-----------------|------|
| TC-CHAT-01 | AR: "خطط سفر 3 أيام في دبي" | Gender-neutral Arabic, no feminine imperatives | ☐ |
| TC-CHAT-02 | EN: "3-day Dubai itinerary" | Proper apostrophes (Here's not Here??s) | ☐ |
| TC-CHAT-03 | AR: ask unsupported topic | Professional fallback + category list | ☐ |
| TC-CHAT-04 | Check markdown | Bold, bullets, headings render | ☐ |
| TC-CHAT-05 | AR: message with brackets/colons | Punctuation in correct visual position | ☐ |
| TC-CHAT-06 | Mobile: tap chat input | Font readable (≥16px), no tiny text | ☐ |
| TC-CHAT-07 | Mobile: type with keyboard open | Input visible, page scrolls correctly | ☐ |
| TC-CHAT-08 | Fashion/skincare query | ≤2 product cards with Shop now | ☐ |
| TC-CHAT-09 | Click Shop now | Opens affiliate URL, no raw URL in chat text | ☐ |
| TC-CHAT-10 | Voice button (Chrome) | Voice input works or graceful message | ☐ |
| TC-CHAT-11 | Upload image + question | Vision response returned | ☐ |

---

### 12.8 Test case: PDF export (TC-PDF)

| Step | Action | Expected result | Pass |
|------|--------|-----------------|------|
| TC-PDF-01 | EN conversation → Export PDF | Clean English text, readable | ☐ |
| TC-PDF-02 | AR conversation → Export PDF | Arabic glyphs correct, no mojibake | ☐ |
| TC-PDF-03 | Mixed AR/EN conversation | Both scripts render correctly | ☐ |
| TC-PDF-04 | Open PDF in Adobe Reader / browser | Formatting acceptable | ☐ |

---

### 12.9 Test case: Auth & dashboard (TC-AUTH)

| Step | Action | Expected result | Pass |
|------|--------|-----------------|------|
| TC-AUTH-01 | Register new account | Success, redirected | ☐ |
| TC-AUTH-02 | Logout + login | Session restored | ☐ |
| TC-AUTH-03 | Visit /dashboard logged out | Redirect to login | ☐ |
| TC-AUTH-04 | Chat while logged in | Exchange saved | ☐ |
| TC-AUTH-05 | Refresh dashboard | Conversation listed | ☐ |
| TC-AUTH-06 | Visit /login while logged in | Redirect to dashboard | ☐ |

---

### 12.10 Test case: Navigation & pages (TC-NAV)

| Step | Action | Expected result | Pass |
|------|--------|-----------------|------|
| TC-NAV-01 | Mobile: tap hamburger | Menu opens | ☐ |
| TC-NAV-02 | Tap link | Navigates + menu closes | ☐ |
| TC-NAV-03 | Tap overlay / Escape | Menu closes | ☐ |
| TC-NAV-04 | Sub-page home icon | Returns to `/` | ☐ |
| TC-NAV-05 | About page | Vision + Mission visible, good spacing | ☐ |
| TC-NAV-06 | Contact form submit | Success message | ☐ |

---

### 12.11 Test case: Admin & affiliates (TC-ADMIN)

| Step | Action | Expected result | Pass |
|------|--------|-----------------|------|
| TC-ADMIN-01 | Admin login | Access /admin | ☐ |
| TC-ADMIN-02 | Add/edit product | Saves affiliate URL | ☐ |
| TC-ADMIN-03 | Upload KB document | Indexes successfully | ☐ |
| TC-ADMIN-04 | Chat query related to KB | Uses indexed content | ☐ |
| TC-ADMIN-05 | Verify affiliate seed | Client links in DB | ☐ |

---

### 12.12 Test case: Typography & luxury feel (TC-UI)

| Step | Action | Expected result | Pass |
|------|--------|-----------------|------|
| TC-UI-01 | Read About page on mobile | Not crowded; clear hierarchy | ☐ |
| TC-UI-02 | Check body text contrast | Readable without strain | ☐ |
| TC-UI-03 | Homepage spacing | Search → categories gap balanced | ☐ |
| TC-UI-04 | Arabic mobile search | "ابحث" placeholder visible | ☐ |
| TC-UI-05 | Overall brand feel | Luxury, not "basic template" | ☐ |

---

### 12.13 Regression checklist (pre-deploy)

- [ ] `npm run build` exits 0
- [ ] No TypeScript errors
- [ ] No console errors on Home, Chat, About
- [ ] Impact + Admitad meta tags in page source
- [ ] Production env vars set on Vercel
- [ ] Git commit pushed to `main`
- [ ] Vercel deployment status: Ready
- [ ] Smoke test on live askraghadai.com (not just localhost)

---

## 13. Acceptance criteria

M2 is **acceptable for client sign-off** when ALL of the following are true:

### Critical (must pass — client will reject if any fail)
1. ✅ Full RTL/LTR switch works system-wide without stuck alignment
2. ✅ Logo position and asset correct per language and device
3. ✅ Language selector shows clear active state
4. ✅ AI Arabic responses are gender-neutral (no feminine imperatives)
5. ✅ Arabic punctuation renders correctly in chat
6. ✅ PDF export renders Arabic without mojibake
7. ✅ Mobile chat input is readable (≥16px)

### High priority (agreed M2 scope)
8. ✅ Affiliate links integrated and visible as Shop now cards
9. ✅ Settings menu with region + language on mobile and desktop
10. ✅ Geolocation with manual override
11. ✅ About Us + Contact Us pages complete
12. ✅ Hamburger navigation functional
13. ✅ AI fallback messages professional
14. ✅ No raw URLs in chat
15. ✅ Admin panel for products + KB operational

### Quality bar
16. ✅ Typography weight and contrast improved
17. ✅ Adequate whitespace on content pages
18. ✅ Luxury aesthetic consistent with design reference
19. ✅ EN and AR both feel professionally localized

---

## 14. Deployment checklist

```powershell
# 1. Run full test matrix locally
npm run dev

# 2. Production build
npm run build

# 3. Commit
git add .
git commit -m "System-wide RTL/LTR fix, localization, PDF Arabic, and M2 polish."

# 4. Push (triggers Vercel)
git push origin main

# 5. Seed affiliates on production (if needed)
# Run against production DATABASE_URL
npx tsx scripts/seed-affiliate-products.ts

# 6. Verify live site
# https://askraghadai.com
```

**Vercel environment variables to confirm:**
- `DATABASE_URL`
- `AUTH_SECRET`
- `OPENAI_API_KEY`

---

## 15. Pending client deliverables

Items **blocked on client** (document but do not delay critical fixes):

| Item | Status | Notes |
|------|--------|-------|
| Final affiliate links | Partial | Links in `afflicate links.md`; client said "working on it" |
| About/Contact final copy | Optional | Structure ready; client may provide final text |
| Admin access for client | Pending | Client must register; dev enables admin flag |
| Phase 3 scope decision | Pending | Client wants estimate for automation features |
| Hostinger migration | Post-M2 | Originally planned after M1 |
| Handover credentials | Post-M2 | GitHub, hosting, API keys per handover requirements |
| Admin video tutorial | Phase 3 | Requested but scoped out of M2 |

---

## 16. Recommended work order & timeline

| Day | Phase | Deliverable |
|-----|-------|-------------|
| **Day 1** | A + B | Direction engine, unified header, language active state, settings UI |
| **Day 2** | C | Arabic prompts, chat bidi, mobile input |
| **Day 3** | D + E | PDF Arabic fonts, typography/spacing pass |
| **Day 4** | F + QA | Affiliate seed, full test matrix, deploy, notify client |

**Client message template (after Day 4):**

> Hi Saleh,  
>  
> I have deployed a consolidated update addressing all items from your review: the system-wide RTL/LTR direction engine, logo behavior, language active indicators, gender-neutral Arabic AI tone, chat punctuation fixes, mobile input sizing, Arabic PDF export, and typography/spacing improvements. Affiliate links have also been integrated per your spreadsheet.  
>  
> The build is live at askraghadai.com for your review. I recommend testing Arabic and English on both mobile and desktop across Home, Chat, About, and Contact, including PDF export with an Arabic conversation.  
>  
> I remain available for any adjustments identified in this review pass.  
>  
> Best regards

---

## Appendix A — Affiliate products list (client-provided)

*Source: `afflicate links.md`*

| Category | Count | Networks |
|----------|-------|----------|
| Smart Travel | 14 | Travelpayouts |
| Fashion | 4 | Admitad |
| Beauty | 2 | Admitad, Amazon |
| Skincare | 2 | Admitad |
| Home & Kitchen | 2 | Admitad |
| General | 8 | Amazon, DCM (Noon) |

---

## Appendix B — Known codebase issues (as of Jul 10)

| Issue | Location | Fix phase |
|-------|----------|-----------|
| Hardcoded `dir="rtl"` on `<html>` | `layout.tsx:39` | A |
| Forced `dir="ltr"` on AR mobile header | `LuxuryHome.tsx:80-91` | A |
| English lockup in Arabic mode | `BrandLogo.tsx`, `Header.tsx` | A |
| Feminine Arabic system prompt | `openai-rag.ts:233+` | C |
| Feminine fallback text | `fallback.ts:10-11` | C |
| jsPDF without Arabic font | `ChatPanel.tsx:176+` | D |
| Chat input 14px | `ChatPanel.tsx:345` | C |
| No bidi on markdown | `markdown/render.tsx` | C |
| Region UI not in nav | `Header.tsx`, `MobileNav.tsx` | B |
| Hardcoded hero subtitle | `LuxuryHome.tsx:180,264` | B |

---

## Appendix C — Related project documents

| File | Purpose |
|------|---------|
| `requirement.md` | Original project brief |
| `chat history.md` | Full Freelancer.com conversation log |
| `afflicate links.md` | Client affiliate spreadsheet |
| `docs/M2-REQUIREMENTS-AND-TESTING.md` | This document |

---

*End of document*
