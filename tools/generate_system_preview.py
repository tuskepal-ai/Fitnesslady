from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "hu" / "assets"
ANDROID_ASSETS = Path.home() / "AndroidStudioProjects" / "FitnessLady" / "app" / "src" / "main" / "assets" / "exercises"


def load_font(candidates, size):
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


FONT_DISPLAY = load_font(
    [r"C:\Windows\Fonts\segoeuib.ttf", r"C:\Windows\Fonts\arialbd.ttf"],
    58,
)
FONT_BOLD = load_font(
    [r"C:\Windows\Fonts\segoeuib.ttf", r"C:\Windows\Fonts\arialbd.ttf"],
    34,
)
FONT_TITLE = load_font(
    [r"C:\Windows\Fonts\segoeuib.ttf", r"C:\Windows\Fonts\arialbd.ttf"],
    42,
)
FONT_TEXT = load_font(
    [r"C:\Windows\Fonts\segoeui.ttf", r"C:\Windows\Fonts\arial.ttf"],
    27,
)
FONT_SMALL = load_font(
    [r"C:\Windows\Fonts\segoeui.ttf", r"C:\Windows\Fonts\arial.ttf"],
    21,
)


PINK = (255, 79, 216)
PINK_2 = (177, 76, 255)
GOLD = (255, 211, 138)
GREEN = (110, 244, 167)
BG = (8, 6, 12)
CARD = (25, 18, 33, 238)
CARD_2 = (18, 13, 25, 228)
WHITE = (247, 243, 250)
MUTED = (204, 194, 216)


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def fit_image(path, size, centering=(0.5, 0.5)):
    img = Image.open(path).convert("RGB")
    return ImageOps.fit(img, size, method=Image.Resampling.LANCZOS, centering=centering)


def add_glow(base, xy, color, blur=48):
    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    draw.ellipse(xy, fill=color)
    glow = glow.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(glow)


def add_shadow(base, box, radius=34):
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    draw.rounded_rectangle(box, radius=radius, fill=(0, 0, 0, 170))
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    base.alpha_composite(shadow)


def draw_text(draw, xy, text, font, fill):
    draw.text(xy, text, font=font, fill=fill)


def make_background():
    canvas = Image.new("RGBA", (960, 1360), BG + (255,))
    draw = ImageDraw.Draw(canvas)
    add_glow(canvas, (30, 40, 420, 430), (255, 79, 216, 120), blur=110)
    add_glow(canvas, (520, 90, 930, 620), (177, 76, 255, 105), blur=120)
    add_glow(canvas, (200, 840, 780, 1320), (120, 34, 108, 110), blur=150)
    for y in range(40, 1320, 52):
        alpha = 16 if (y // 52) % 2 == 0 else 9
        draw.line((70, y, 890, y), fill=(255, 255, 255, alpha), width=1)
    return canvas


def draw_header(draw, title, subtitle, chip_left, chip_right):
    draw.rounded_rectangle((64, 70, 286, 122), radius=25, fill=(39, 27, 50, 218), outline=(255, 255, 255, 18), width=1)
    draw_text(draw, (92, 83), title, FONT_TITLE, WHITE)
    draw_text(draw, (64, 144), subtitle, FONT_TEXT, MUTED)

    lw = draw.textbbox((0, 0), chip_left, font=FONT_SMALL)[2] + 42
    rw = draw.textbbox((0, 0), chip_right, font=FONT_SMALL)[2] + 42
    draw.rounded_rectangle((64, 206, 64 + lw, 248), radius=22, fill=(49, 35, 60, 212), outline=(255, 255, 255, 16), width=1)
    draw_text(draw, (84, 216), chip_left, FONT_SMALL, GOLD)
    draw.rounded_rectangle((960 - 64 - rw, 206, 960 - 64, 248), radius=22, fill=(49, 35, 60, 212), outline=(255, 255, 255, 16), width=1)
    draw_text(draw, (960 - 44 - rw, 216), chip_right, FONT_SMALL, WHITE)


def draw_meta_chip(draw, x, y, text, accent=None):
    fill = accent if accent else MUTED
    width = draw.textbbox((0, 0), text, font=FONT_SMALL)[2] + 40
    draw.rounded_rectangle((x, y, x + width, y + 42), radius=21, fill=(42, 31, 54, 212), outline=(255, 255, 255, 16), width=1)
    draw_text(draw, (x + 18, y + 10), text, FONT_SMALL, fill)
    return width


def draw_progress_card(base, x, y, title, rows):
    w, h = 300, 210
    add_shadow(base, (x + 6, y + 10, x + w + 6, y + h + 10), radius=30)
    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(card)
    draw.rounded_rectangle((0, 0, w - 1, h - 1), radius=30, fill=CARD, outline=(255, 255, 255, 18), width=1)
    draw_text(draw, (24, 20), title, FONT_TITLE, WHITE)
    yy = 78
    for label, value, accent, width in rows:
      draw_text(draw, (24, yy), label, FONT_SMALL, MUTED)
      draw_text(draw, (w - 92, yy), value, FONT_SMALL, accent)
      draw.rounded_rectangle((24, yy + 36, w - 24, yy + 48), radius=6, fill=(60, 49, 72, 255))
      draw.rounded_rectangle((24, yy + 36, 24 + int((w - 48) * width), yy + 48), radius=6, fill=accent + (255,))
      yy += 74
    base.alpha_composite(card, (x, y))


def draw_exercise_feature(base):
    draw = ImageDraw.Draw(base)
    draw_header(draw, "Fix edzések", "A rutinod egy pillantásra követhető és motiváló.", "Nagy, tiszta preview", "Intervallumos flow")

    box = (88, 286, 820, 1180)
    add_shadow(base, (100, 304, 832, 1194), radius=40)
    panel = Image.new("RGBA", (box[2] - box[0], box[3] - box[1]), (0, 0, 0, 0))
    pdraw = ImageDraw.Draw(panel)
    pdraw.rounded_rectangle((0, 0, panel.width - 1, panel.height - 1), radius=38, fill=CARD, outline=(255, 255, 255, 18), width=1)
    base.alpha_composite(panel, (box[0], box[1]))

    hero = fit_image(ANDROID_ASSETS / "fekvotamasz.png", (660, 348), centering=(0.54, 0.38)).convert("RGBA")
    hero.putalpha(rounded_mask(hero.size, 28))
    base.alpha_composite(hero, (124, 320))

    draw.ellipse((684, 336, 766, 418), fill=(214, 91, 244, 255))
    draw_text(draw, (715, 364), "FL", FONT_SMALL, WHITE)

    draw_text(draw, (126, 714), "Fekvőtámasz", FONT_DISPLAY, WHITE)
    draw_text(draw, (130, 794), "Felsőtest", FONT_TITLE, PINK)
    draw.multiline_text((126, 856), "Mell, váll és tricepsz erősítése.\nLetisztult kártya, tiszta ritmus, prémium nézet.", font=FONT_TEXT, fill=MUTED, spacing=10)

    cx = 126
    for label, accent in [("30 mp munka", GOLD), ("15 mp pihenő", MUTED), ("3 kör", MUTED)]:
        cx += 0
        cx += draw_meta_chip(draw, cx, 996, label, accent) + 10

    draw.rounded_rectangle((126, 1080, 432, 1156), radius=38, fill=PINK + (255,), outline=(255, 255, 255, 18), width=1)
    draw_text(draw, (208, 1104), "Indítás", FONT_TITLE, (28, 11, 25))
    draw.rounded_rectangle((454, 1080, 784, 1156), radius=38, fill=(35, 26, 44, 220), outline=(255, 255, 255, 18), width=1)
    draw_text(draw, (548, 1104), "Részletek", FONT_TITLE, WHITE)

    draw_progress_card(base, 96, 1196, "Napi célok", [("Víz", "6/8", PINK, 0.72), ("Alvás", "7/8", GOLD, 0.84)])


def draw_timer_feature(base):
    draw = ImageDraw.Draw(base)
    draw_header(draw, "Stopper", "A köridő nem apró részlet, hanem központi élmény.", "Neon köridő", "Flow-os ritmus")

    left = (94, 286, 488, 1148)
    right = (522, 286, 826, 1148)
    add_shadow(base, (left[0] + 8, left[1] + 14, left[2] + 8, left[3] + 14), radius=38)
    add_shadow(base, (right[0] + 8, right[1] + 14, right[2] + 8, right[3] + 14), radius=38)
    for box in (left, right):
        panel = Image.new("RGBA", (box[2] - box[0], box[3] - box[1]), (0, 0, 0, 0))
        ImageDraw.Draw(panel).rounded_rectangle((0, 0, panel.width - 1, panel.height - 1), radius=36, fill=CARD, outline=(255, 255, 255, 18), width=1)
        base.alpha_composite(panel, (box[0], box[1]))

    image = fit_image(ANDROID_ASSETS / "kitores.png", (356, 286), centering=(0.5, 0.28)).convert("RGBA")
    image.putalpha(rounded_mask(image.size, 26))
    base.alpha_composite(image, (112, 314))
    draw_text(draw, (118, 632), "Fix kártya + stopper", FONT_BOLD, WHITE)
    draw.multiline_text((118, 690), "A gyakorlat, a köridő és a ritmus együtt jelenik meg,\nígy nincs szétesett felület és nincs keresgélés.", font=FONT_TEXT, fill=MUTED, spacing=10)

    cx, cy = 674, 616
    ring = Image.new("RGBA", base.size, (0, 0, 0, 0))
    rdraw = ImageDraw.Draw(ring)
    rdraw.ellipse((cx - 150, cy - 150, cx + 150, cy + 150), fill=(60, 47, 71, 255))
    rdraw.pieslice((cx - 150, cy - 150, cx + 150, cy + 150), start=205, end=485, fill=PINK + (255,))
    rdraw.ellipse((cx - 106, cy - 106, cx + 106, cy + 106), fill=(9, 7, 12, 255))
    base.alpha_composite(ring)
    draw_text(draw, (cx - 74, cy - 18), "00:35", FONT_DISPLAY, WHITE)
    draw_text(draw, (cx - 52, cy + 48), "munkaidő", FONT_SMALL, MUTED)
    draw_text(draw, (cx - 34, cy + 84), "kör 1/3", FONT_SMALL, GOLD)
    draw.rounded_rectangle((568, 918, 780, 992), radius=36, fill=PINK + (255,), outline=(255, 255, 255, 18), width=1)
    draw_text(draw, (624, 940), "Indítás", FONT_TITLE, (28, 11, 25))
    draw.rounded_rectangle((568, 1006, 780, 1080), radius=36, fill=(35, 26, 44, 220), outline=(255, 255, 255, 18), width=1)
    draw_text(draw, (640, 1028), "Reset", FONT_TITLE, WHITE)


def draw_package_feature(base):
    draw = ImageDraw.Draw(base)
    draw_header(draw, "Csomagok", "A previewben is látszódjon, hogy nem egyetlen opció létezik.", "Animált kártyapakli", "Prémium rendszer")

    cards = [
        {
            "name": "Start",
            "meta": "4 hét • tiszta indulás",
            "lines": ["Személyre szabott edzésterv", "Alap táplálkozási rendszer", "1x kontroll és finomhangolás"],
            "x": 112,
            "y": 286,
            "w": 612,
            "h": 248,
            "accent": GOLD,
        },
        {
            "name": "Balance",
            "meta": "6 hét • heti követés",
            "lines": ["Edzésrendszer videókkal", "Heti követés és módosítás", "Progresszió és rutintartás"],
            "x": 140,
            "y": 430,
            "w": 660,
            "h": 278,
            "accent": PINK,
        },
        {
            "name": "Pro",
            "meta": "12 hét • mély támogatás",
            "lines": ["Maximális rendszerélmény", "Gyakoribb kontroll", "Check-in és erősebb jelenlét"],
            "x": 190,
            "y": 612,
            "w": 598,
            "h": 248,
            "accent": PINK_2,
        },
    ]

    for idx, card in enumerate(cards):
        add_shadow(base, (card["x"] + 8, card["y"] + 12, card["x"] + card["w"] + 8, card["y"] + card["h"] + 12), radius=34)
        panel = Image.new("RGBA", (card["w"], card["h"]), (0, 0, 0, 0))
        draw_p = ImageDraw.Draw(panel)
        fill = (24, 17, 32, 242) if idx == 1 else (20, 15, 28, 226)
        draw_p.rounded_rectangle((0, 0, card["w"] - 1, card["h"] - 1), radius=34, fill=fill, outline=(255, 255, 255, 18), width=1)
        base.alpha_composite(panel, (card["x"], card["y"]))
        draw_text(draw, (card["x"] + 30, card["y"] + 26), card["name"], FONT_TITLE, WHITE)
        draw_text(draw, (card["x"] + 182, card["y"] + 31), card["meta"], FONT_SMALL, card["accent"])
        by = card["y"] + 86
        for line in card["lines"]:
            draw.rounded_rectangle((card["x"] + 32, by + 8, card["x"] + 44, by + 20), radius=6, fill=card["accent"] + (255,))
            draw_text(draw, (card["x"] + 56, by), line, FONT_SMALL, MUTED)
            by += 40
        if idx == 1:
            draw.rounded_rectangle((card["x"] + 30, card["y"] + card["h"] - 66, card["x"] + 274, card["y"] + card["h"] - 18), radius=24, fill=PINK + (255,))
            draw_text(draw, (card["x"] + 86, card["y"] + card["h"] - 54), "Legjobb egyensúly", FONT_SMALL, (28, 11, 25))

    draw_progress_card(base, 594, 934, "Rendszer", [("Videó", "program szerint", PINK, 0.86), ("Check-in", "csomaghoz igazítva", GREEN, 0.74)])


def build_frames():
    frames = []
    frame1 = make_background()
    draw_exercise_feature(frame1)
    frames.append(frame1)

    frame2 = make_background()
    draw_timer_feature(frame2)
    frames.append(frame2)

    frame3 = make_background()
    draw_package_feature(frame3)
    frames.append(frame3)
    return frames


def save_outputs(frames):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    poster = OUT_DIR / "system-preview-poster.jpg"
    animated = OUT_DIR / "system-preview-loop.webp"
    frames[1].convert("RGB").save(poster, quality=92, subsampling=0)
    frames[0].save(
        animated,
        save_all=True,
        append_images=frames[1:],
        duration=[1200, 1200, 1400],
        loop=0,
        lossless=False,
        quality=86,
        method=6,
    )
    return poster, animated


if __name__ == "__main__":
    frames = build_frames()
    poster, animated = save_outputs(frames)
    print(f"created: {poster}")
    print(f"created: {animated}")
