"""
Generate a short walkthrough MP4 for the client:
  Sign up / Register  ->  Sign in as admin  ->  Edit a category name.

Captures REAL screenshots of the running app with Playwright, then composes
them into a captioned portrait (9:16) video with imageio-ffmpeg.

Prereqs (already installed):
  pip install playwright imageio-ffmpeg pillow numpy
  python -m playwright install chromium

Run (app must be running on http://localhost:3000):
  python scripts/create-walkthrough-video.py
"""

import os
import time
import tempfile

import numpy as np
import imageio.v2 as imageio
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
ADMIN_EMAIL = "saloh3530@gmail.com"
ADMIN_PASSWORD = "Raghad@Admin2026"

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "raghad-walkthrough.mp4")
FRAMES_DIR = os.path.join(tempfile.gettempdir(), "raghad-walkthrough-frames")
os.makedirs(FRAMES_DIR, exist_ok=True)

# ---- palette ----
BG = (243, 236, 224)
GREEN = (31, 82, 64)
GREEN2 = (44, 110, 85)
GOLD = (201, 169, 98)
DARK = (36, 51, 44)
WHITE = (255, 255, 255)
HILITE = (214, 78, 60)

VW, VH = 430, 932       # phone viewport (CSS px)
DSF = 2                 # device scale factor -> screenshots are 860x1864
CANVAS_W, CANVAS_H = 720, 1280
FPS = 30

# ---- fonts ----
def _font(name, size):
    for p in (fr"C:\Windows\Fonts\{name}", name):
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()

F_TITLE = _font("arialbd.ttf", 46)
F_STEP = _font("arialbd.ttf", 26)
F_CAP = _font("arialbd.ttf", 34)
F_SUB = _font("arial.ttf", 26)
F_FOOT = _font("arial.ttf", 22)

scenes = []  # list of dicts: {img: PIL.Image, caption, step, seconds}


def wrap(draw, text, font, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=font) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def compose(shot_path, step, caption, subcaption=""):
    """Build one 720x1280 scene image from a screenshot + caption band."""
    canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), BG)
    d = ImageDraw.Draw(canvas)

    # top caption band
    band_h = 210
    d.rectangle([0, 0, CANVAS_W, band_h], fill=GREEN)
    d.rectangle([0, band_h, CANVAS_W, band_h + 6], fill=GOLD)

    # step badge
    badge = f"STEP {step}" if step else "RAGHAD AI"
    d.rounded_rectangle([40, 34, 40 + 14 + int(d.textlength(badge, font=F_STEP)) + 14, 78],
                        radius=18, fill=GOLD)
    d.text((54, 40), badge, font=F_STEP, fill=DARK)

    # caption (wrapped)
    cap_lines = wrap(d, caption, F_CAP, CANVAS_W - 80)
    y = 98
    for ln in cap_lines[:2]:
        d.text((40, y), ln, font=F_CAP, fill=WHITE)
        y += 42
    if subcaption:
        for ln in wrap(d, subcaption, F_SUB, CANVAS_W - 80)[:1]:
            d.text((40, y + 2), ln, font=F_SUB, fill=(220, 230, 224))

    # screenshot area
    area_top = band_h + 26
    area_bot = CANVAS_H - 56
    area_h = area_bot - area_top
    area_w = CANVAS_W - 80

    shot = Image.open(shot_path).convert("RGB")
    sw, sh = shot.size
    scale = min(area_w / sw, area_h / sh)
    nw, nh = int(sw * scale), int(sh * scale)
    shot = shot.resize((nw, nh), Image.LANCZOS)
    px = (CANVAS_W - nw) // 2
    py = area_top + (area_h - nh) // 2

    # soft frame
    d.rounded_rectangle([px - 8, py - 8, px + nw + 8, py + nh + 8],
                        radius=22, fill=WHITE, outline=GOLD, width=3)
    canvas.paste(shot, (px, py))

    # footer
    foot = "Raghad AI  •  askraghadai.com"
    fw = d.textlength(foot, font=F_FOOT)
    d.text(((CANVAS_W - fw) / 2, CANVAS_H - 40), foot, font=F_FOOT, fill=(120, 133, 122))
    return canvas


def title_card(title, subtitle):
    canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), GREEN)
    d = ImageDraw.Draw(canvas)
    d.rectangle([0, CANVAS_H // 2 + 90, CANVAS_W, CANVAS_H // 2 + 96], fill=GOLD)
    lines = wrap(d, title, F_TITLE, CANVAS_W - 100)
    y = CANVAS_H // 2 - 60 - len(lines) * 28
    for ln in lines:
        w = d.textlength(ln, font=F_TITLE)
        d.text(((CANVAS_W - w) / 2, y), ln, font=F_TITLE, fill=WHITE)
        y += 58
    subs = wrap(d, subtitle, F_SUB, CANVAS_W - 120)
    y = CANVAS_H // 2 + 120
    for ln in subs:
        w = d.textlength(ln, font=F_SUB)
        d.text(((CANVAS_W - w) / 2, y), ln, font=F_SUB, fill=(220, 230, 224))
        y += 36
    return canvas


# ---------------- capture ----------------
def run_capture():
    idx = {"n": 0}

    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(
            viewport={"width": VW, "height": VH},
            device_scale_factor=DSF,
        )
        ctx.add_cookies([{"name": "raghad-locale", "value": "en", "url": BASE}])
        page = ctx.new_page()

        def shot(step, caption, sub="", highlight=None, hold=3.2):
            idx["n"] += 1
            path = os.path.join(FRAMES_DIR, f"s{idx['n']:02d}.png")
            page.screenshot(path=path)
            if highlight is not None:
                im = Image.open(path).convert("RGB")
                dd = ImageDraw.Draw(im)
                x = highlight["x"] * DSF
                y = highlight["y"] * DSF
                w = highlight["width"] * DSF
                h = highlight["height"] * DSF
                pad = 8
                for i, wdt in enumerate((6, 4)):
                    off = pad + i * 4
                    dd.rounded_rectangle([x - off, y - off, x + w + off, y + h + off],
                                         radius=16, outline=HILITE, width=wdt)
                im.save(path)
            scenes.append({"path": path, "step": step, "caption": caption,
                           "sub": sub, "seconds": hold})

        def hl(selector):
            el = page.locator(selector).first
            el.scroll_into_view_if_needed()
            page.wait_for_timeout(200)
            box = el.bounding_box()
            return box

        # 1) Home
        page.goto(BASE, wait_until="networkidle")
        page.wait_for_timeout(800)
        shot(1, "Open the Raghad AI website")

        # 2) Tap the menu (highlight hamburger)
        box = hl("header button[aria-expanded]")
        shot(2, "Tap the menu button (top corner)", highlight=box)

        # open the drawer
        page.locator("header button[aria-expanded]").first.click()
        page.wait_for_timeout(600)

        # 3) Sign In / Register link in drawer
        acct = page.locator("aside").get_by_role("link", name="Sign In / Register").first
        acct.scroll_into_view_if_needed()
        box = acct.bounding_box()
        shot(3, "Tap 'Sign In / Register'", highlight=box)
        acct.click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(600)

        # 4) Register tab
        page.locator("#auth-register-tab").click()
        page.wait_for_timeout(500)
        box = page.locator("#auth-register-tab").bounding_box()
        shot(4, "Choose the 'Create account' tab", highlight=box)

        # 5) Fill details
        demo_email = f"demo{int(time.time())}@example.com"
        page.locator("#auth-name").fill("Demo User")
        page.locator("#auth-email").fill(demo_email)
        page.locator("#auth-password").fill("Demo12345")
        page.wait_for_timeout(300)
        shot(5, "Enter your name, email and password",
             sub="Password must be at least 6 characters")

        # 6) Submit -> signed in
        page.locator('#auth-form-panel button[type="submit"]').click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1800)
        shot(6, "Done — your account is created and you're signed in")

        # ---- Admin part: sign in as admin ----
        # log out the demo user first (login page redirects authed users away)
        page.request.delete(f"{BASE}/api/auth/me")
        page.wait_for_timeout(500)

        page.goto(f"{BASE}/login", wait_until="networkidle")
        page.wait_for_timeout(800)
        # ensure on Sign in tab
        try:
            page.locator("#auth-login-tab").click()
            page.wait_for_timeout(300)
        except Exception:
            pass
        page.wait_for_selector("#auth-email", timeout=15000)
        page.locator("#auth-email").fill(ADMIN_EMAIL)
        page.locator("#auth-password").fill(ADMIN_PASSWORD)
        page.wait_for_timeout(300)
        shot(7, "To manage the site, sign in with your admin account",
             sub="Admin: saloh3530@gmail.com")
        page.locator('#auth-form-panel button[type="submit"]').click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)

        # 8) Open menu -> Admin
        page.locator("header button[aria-expanded]").first.click()
        page.wait_for_selector("aside", timeout=8000)
        page.wait_for_timeout(500)
        admin_link = page.locator("aside").get_by_role("link", name="Admin").first
        admin_link.scroll_into_view_if_needed()
        box = admin_link.bounding_box()
        shot(8, "Open the menu and tap 'Admin'", highlight=box)
        admin_link.click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)

        # 9) Admin dashboard -> Category Cards
        cat = page.get_by_role("link", name="Homepage Category Cards").first
        cat.scroll_into_view_if_needed()
        box = cat.bounding_box()
        shot(9, "Open 'Homepage Category Cards'", highlight=box)
        cat.click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)

        # 10) Edit first card
        edit = page.get_by_role("button", name="Edit").first
        edit.scroll_into_view_if_needed()
        box = edit.bounding_box()
        shot(10, "Tap 'Edit' on any category", highlight=box)
        edit.click()
        page.wait_for_timeout(800)

        # 11) Change the English name
        name_input = page.get_by_placeholder("Name / Title (English)").first
        name_input.scroll_into_view_if_needed()
        name_input.click()
        name_input.fill("Fashion & Abayas (Updated)")
        page.wait_for_timeout(300)
        box = name_input.bounding_box()
        shot(11, "Change the category name (English and Arabic)", highlight=box)

        # 12) Save
        save = page.get_by_role("button", name="Save changes").first
        save.scroll_into_view_if_needed()
        box = save.bounding_box()
        shot(12, "Tap 'Save changes' — the update goes live instantly",
             highlight=box)
        # actually save then revert so we don't change real data
        save.click()
        page.wait_for_timeout(1200)
        # revert the name back to original
        try:
            page.get_by_role("button", name="Edit").first.click()
            page.wait_for_timeout(500)
            ni = page.get_by_placeholder("Name / Title (English)").first
            ni.fill("Fashion & Abayas")
            page.get_by_role("button", name="Save changes").first.click()
            page.wait_for_timeout(1000)
        except Exception as e:
            print("revert skipped:", e)

        browser.close()


# ---------------- compose video ----------------
def write_video():
    imgs = []
    # intro
    imgs.append((title_card("How to sign up & manage Raghad AI",
                            "A quick guide for testing"), 3.0))
    for s in scenes:
        imgs.append((compose(s["path"], s["step"], s["caption"], s["sub"]),
                     s["seconds"]))
    imgs.append((title_card("You're all set!",
                            "Try it yourself at askraghadai.com"), 3.0))

    writer = imageio.get_writer(OUT, fps=FPS, codec="libx264", quality=8,
                                macro_block_size=None,
                                ffmpeg_params=["-pix_fmt", "yuv420p"])
    prev = None
    fade_frames = 8
    for img, secs in imgs:
        arr = np.array(img)
        if prev is not None:
            for i in range(fade_frames):
                a = (i + 1) / fade_frames
                blend = (prev * (1 - a) + arr * a).astype(np.uint8)
                writer.append_data(blend)
        hold = max(1, int(secs * FPS))
        for _ in range(hold):
            writer.append_data(arr)
        prev = arr.astype(np.float32)
    writer.close()
    print("VIDEO WRITTEN:", OUT)


if __name__ == "__main__":
    run_capture()
    write_video()
    size_mb = os.path.getsize(OUT) / (1024 * 1024)
    print(f"Scenes: {len(scenes)}  Size: {size_mb:.2f} MB")
