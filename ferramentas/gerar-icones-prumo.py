from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def icon(size):
    scale = 4
    s = size * scale
    image = Image.new("RGBA", (s, s), (9, 9, 11, 255))
    draw = ImageDraw.Draw(image)
    radius = round(s * .23)
    draw.rounded_rectangle((0, 0, s - 1, s - 1), radius=radius, fill=(9, 9, 11, 255))
    colors = [(167, 139, 250), (109, 93, 251), (34, 211, 238)]
    for inset in range(max(2, s // 70)):
        t = inset / max(1, s // 70)
        color = mix(colors[0], colors[2], t)
        draw.rounded_rectangle((inset, inset, s - 1 - inset, s - 1 - inset), radius=radius, outline=color + (180,))

    width = max(3, round(s * .105))
    x, top, bottom = round(s * .29), round(s * .25), round(s * .73)
    mid, right = round(s * .57), round(s * .70)
    draw.line((x, bottom, x, top, mid, top), fill=colors[0] + (255,), width=width, joint="curve")
    draw.arc((round(s*.43), top, right, round(s*.58)), -90, 90, fill=colors[2] + (255,), width=width)
    draw.line((mid, round(s*.58), round(s*.42), round(s*.58)), fill=colors[1] + (255,), width=width)
    draw.line((round(s*.56), bottom, round(s*.72), bottom), fill=(255, 255, 255, 255), width=max(2, round(s*.075)))
    return image.resize((size, size), Image.Resampling.LANCZOS)


for value in (16, 48, 128):
    icon(value).save(ROOT / "extensao" / f"icon{value}.png")

icon(512).save(ROOT / "icon.png")
print("Ícones Prumo gerados.")
