from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
DESKTOP = Path.home() / "OneDrive" / "Desktop"
OUT_DIR = ROOT / "hu" / "assets"


def load_font(candidates, size):
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


FONT_BOLD = load_font(
    [
        r"C:\Windows\Fonts\segoeuib.ttf",
        r"C:\Windows\Fonts\arialbd.ttf",
    ],
    60,
)
FONT_TITLE = load_font(
    [
        r"C:\Windows\Fonts\segoeuib.ttf",
        r"C:\Windows\Fonts\arialbd.ttf",
    ],
    44,
)
FONT_TEXT = load_font(
    [
        r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ],
    28,
)
FONT_SMALL = load_font(
    [
        r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ],
    22,
)


PINK = (255, 79, 216)
PINK_2 = (177, 76, 255)
GOLD = (255, 211, 138)
BG = (8, 6, 12)
CARD = (28, 19, 35, 238)
CARD_2 = (20, 14, 28, 225)
WHITE = (247, 243, 250)
MUTED = (204, 194, 216)
LINE = (109, 95, 123, 165)


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def add_glow(base, xy, color, blur=42):
    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    draw.ellipse(xy, fill=color)
    glow = glow.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(glow)


def make_background():
    canvas = Image.new("RGBA", (900, 1600), BG + (255,))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 900, 1600), fill=(8, 6, 12, 255))
    add_glow(canvas, (20, 60, 450, 520), (255, 79, 216, 120), blur=100)
    add_glow(canvas, (420, 120, 880, 720), (177, 76, 255, 110), blur=120)
    add_glow(canvas, (220, 900, 760, 1480), (120, 35, 110, 110), blur=140)

    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw_o = ImageDraw.Draw(overlay)
    for y in range(0, 1600, 44):
        alpha = 16 if (y // 44) % 2 == 0 else 8
        draw_o.line((60, y, 840, y), fill=(255, 255, 255, alpha), width=1)
    canvas.alpha_composite(overlay)
    return canvas


def find_path(patterns):
    for pattern in patterns:
        matches = list(DESKTOP.glob(pattern))
        if matches:
            return matches[0]
    return None


def fit_image(img, size):
    return ImageOps.fit(img.convert("RGB"), size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


def draw_phone_frame(base, screenshot_path, title, subtitle, chip_text, time_label, button_label, scale=1.0):
    screen_w, screen_h = int(360 * scale), int(760 * scale)
    outer = Image.new("RGBA", (screen_w + 36, screen_h + 36), (0, 0, 0, 0))
    outer_draw = ImageDraw.Draw(outer)
    outer_draw.rounded_rectangle((0, 0, outer.width - 1, outer.height - 1), radius=52, fill=(31, 20, 42, 235), outline=(208, 92, 218, 115), width=2)
    outer_draw.rounded_rectangle((14, 14, outer.width - 14, outer.height - 14), radius=40, fill=(14, 10, 20, 255))

    screenshot = fit_image(Image.open(screenshot_path), (screen_w - 24, screen_h - 24))
    screenshot_rgba = screenshot.convert("RGBA")
    screenshot_rgba.putalpha(rounded_mask((screen_w - 24, screen_h - 24), 34))
    outer.alpha_composite(screenshot_rgba, (18, 18))

    phone_x = (base.width - outer.width) // 2
    phone_y = 250
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle((phone_x + 14, phone_y + 24, phone_x + outer.width + 8, phone_y + outer.height + 18), radius=58, fill=(0, 0, 0, 160))
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))
    base.alpha_composite(shadow)
    base.alpha_composite(outer, (phone_x, phone_y))

    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle((70, 84, 330, 138), radius=27, fill=(41, 28, 51, 214), outline=(255, 255, 255, 20), width=1)
    draw.text((96, 97), title, fill=WHITE, font=FONT_TITLE)
    draw.text((70, 154), subtitle, fill=MUTED, font=FONT_TEXT)

    chip_w = draw.textbbox((0, 0), chip_text, font=FONT_SMALL)[2] + 56
    draw.rounded_rectangle((70, 202, 70 + chip_w, 246), radius=22, fill=(52, 36, 61, 210), outline=(255, 255, 255, 18), width=1)
    draw.text((96, 213), chip_text, fill=GOLD, font=FONT_SMALL)

    bubble = (base.width - 236, 152, base.width - 72, 238)
    draw.rounded_rectangle(bubble, radius=28, fill=(28, 20, 34, 235), outline=(255, 255, 255, 18), width=1)
    draw.text((bubble[0] + 22, bubble[1] + 16), time_label, fill=WHITE, font=FONT_SMALL)
    draw.text((bubble[0] + 22, bubble[1] + 45), "Glow-os interval timer", fill=MUTED, font=FONT_SMALL)

    cta = (base.width - 276, 1288, base.width - 78, 1362)
    draw.rounded_rectangle(cta, radius=38, fill=PINK + (255,), outline=(255, 255, 255, 26), width=1)
    draw.text((cta[0] + 34, cta[1] + 19), button_label, fill=(28, 11, 25), font=FONT_TITLE)


def draw_stat_card(base, x, y, w, h, title, rows):
    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(card)
    draw.rounded_rectangle((0, 0, w - 1, h - 1), radius=32, fill=CARD, outline=(255, 255, 255, 24), width=1)
    draw.text((28, 22), title, fill=WHITE, font=FONT_TITLE)
    yy = 82
    for label, value, accent in rows:
        draw.text((28, yy), label, fill=MUTED, font=FONT_SMALL)
        draw.text((w - 180, yy), value, fill=accent, font=FONT_SMALL)
        draw.rounded_rectangle((28, yy + 38, w - 28, yy + 52), radius=7, fill=(54, 45, 63, 255))
        draw.rounded_rectangle((28, yy + 38, 28 + int((w - 56) * 0.72), yy + 52), radius=7, fill=accent + (255,))
        yy += 92
    base.alpha_composite(card, (x, y))


def draw_package_card(base):
    draw = ImageDraw.Draw(base)
    panel = (76, 140, 824, 1464)
    draw.rounded_rectangle(panel, radius=42, fill=(24, 18, 32, 236), outline=(255, 255, 255, 24), width=1)
    draw.text((118, 188), "Start • Balance • Pro", fill=WHITE, font=FONT_BOLD)
    draw.text((118, 270), "Ugyanaz a prémium rendszer, más mélységű támogatással.", fill=MUTED, font=FONT_TEXT)

    rows = [
        ("Start", "4 hét • tiszta struktúra", ["Személyre szabott edzésterv", "Alap táplálkozási rendszer", "1x kontroll és finomhangolás"]),
        ("Balance", "6 hét • heti követés", ["Edzésrendszer videókkal", "Heti követés és módosítás", "Progresszió és rutintartás"]),
        ("Pro", "12 hét • maximális támogatás", ["Mély személyre szabás", "Gyakoribb kontroll", "Check-in és teljesebb jelenlét"]),
    ]
    card_y = 382
    for idx, (name, meta, bullets) in enumerate(rows):
        x1, y1, x2, y2 = 116, card_y, 784, card_y + 258
        draw.rounded_rectangle((x1, y1, x2, y2), radius=32, fill=CARD_2, outline=(255, 255, 255, 18), width=1)
        accent = PINK if idx != 1 else GOLD
        draw.text((146, y1 + 28), name, fill=WHITE, font=FONT_TITLE)
        draw.text((290, y1 + 32), meta, fill=accent, font=FONT_SMALL)
        bullet_y = y1 + 92
        for bullet in bullets:
            draw.rounded_rectangle((146, bullet_y + 8, 160, bullet_y + 22), radius=7, fill=accent + (255,))
            draw.text((178, bullet_y), bullet, fill=MUTED, font=FONT_TEXT)
            bullet_y += 52
        card_y += 290

    draw.rounded_rectangle((118, 1286, 454, 1368), radius=40, fill=PINK + (255,), outline=(255, 255, 255, 26), width=1)
    draw.text((154, 1310), "Csomagok", fill=(28, 11, 25), font=FONT_TITLE)
    draw.rounded_rectangle((474, 1286, 780, 1368), radius=40, fill=(35, 26, 44, 220), outline=(255, 255, 255, 22), width=1)
    draw.text((526, 1310), "Rendszer", fill=WHITE, font=FONT_TITLE)


def build_frames():
    screenshot_1 = find_path(["aaaaa.jpeg"])
    screenshot_2 = find_path(["*igaz*.jpeg", "*igaz*.jpg"])
    portrait = find_path(["edina-about.jpg.jpg", "edina-about*.jpg", "edina-about*.jpeg"])
    if portrait is None:
        portrait = ROOT / "hu" / "assets" / "rolam.jpg"

    frames = []

    frame1 = make_background()
    draw_phone_frame(
        frame1,
        screenshot_1,
        "Fix edzések",
        "A napi céloktól egy koppintásra indul a rutin.",
        "Intervallumos, motiváló felület",
        "3 kör • időzítő",
        "Indítás",
    )
    draw_stat_card(
        frame1,
        88,
        1218,
        324,
        264,
        "Napi ritmus",
        [
            ("Víz", "6/8", PINK),
            ("Alvás", "7/8", GOLD),
        ],
    )
    frames.append(frame1)

    frame2 = make_background()
    draw_phone_frame(
        frame2,
        screenshot_2,
        "Stopper + fókusz",
        "A köridő és a tempó egyszerre motivál és vezet.",
        "Neon kör stopper",
        "35 mp munka",
        "Részletek",
        scale=1.02,
    )
    draw_stat_card(
        frame2,
        530,
        190,
        282,
        214,
        "Check-in",
        [
            ("Heti haladás", "+18%", PINK_2),
        ],
    )
    frames.append(frame2)

    frame3 = make_background()
    portrait_img = fit_image(Image.open(portrait), (248, 320)).convert("RGBA")
    portrait_img.putalpha(rounded_mask(portrait_img.size, 30))
    shadow = Image.new("RGBA", frame3.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((96, 144, 372, 490), radius=36, fill=(0, 0, 0, 170))
    shadow = shadow.filter(ImageFilter.GaussianBlur(20))
    frame3.alpha_composite(shadow)
    frame3.alpha_composite(portrait_img, (110, 158))
    draw = ImageDraw.Draw(frame3)
    draw.text((396, 178), "Személyes támogatás", fill=WHITE, font=FONT_BOLD)
    draw.text((396, 264), "Nem csak tervet kapsz, hanem rendszert és visszajelzést is.", fill=MUTED, font=FONT_TEXT)
    draw_stat_card(
        frame3,
        404,
        344,
        390,
        318,
        "Kapcsolat",
        [
            ("Check-in", "Hetente", PINK),
            ("Módosítás", "Program szerint", GOLD),
            ("Támogatás", "Valós jelenlét", PINK_2),
        ],
    )
    draw_package_card(frame3)
    frames.append(frame3)

    return frames


def save_outputs(frames):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    poster = OUT_DIR / "system-preview-poster.jpg"
    animated = OUT_DIR / "system-preview-loop.webp"

    frames[0].convert("RGB").save(poster, quality=92, subsampling=0)
    frames[0].save(
        animated,
        save_all=True,
        append_images=frames[1:],
        duration=[1200, 1200, 1400],
        loop=0,
        lossless=False,
        quality=84,
        method=6,
    )
    return poster, animated


if __name__ == "__main__":
    frames = build_frames()
    poster, animated = save_outputs(frames)
    print(f"created: {poster}")
    print(f"created: {animated}")
