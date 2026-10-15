#!/usr/bin/env python3
"""Generate top-down 8-direction idle + walk sprite sheets for 《無菌室》."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

OUT_DIR = Path(__file__).resolve().parent
CELL = 32
WALK_FRAMES = 4  # rows in walk sheets
DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
# Angle in radians: 0 = East (canvas +x), CCW. Top-down: N = up = -Y.
DIR_ANGLE = {
    "N": -math.pi / 2,
    "NE": -math.pi / 4,
    "E": 0.0,
    "SE": math.pi / 4,
    "S": math.pi / 2,
    "SW": 3 * math.pi / 4,
    "W": math.pi,
    "NW": -3 * math.pi / 4,
}

CHARACTERS = [
    {
        "id": "liang-zi-an",
        "name_zh": "梁子安",
        "body": (196, 165, 116, 255),  # #c4a574 warmer/brighter player
        "head": (42, 36, 28, 255),
        "skin": (232, 210, 180, 255),
        "accent": (210, 180, 130, 255),
        "body_rx": 9,
        "body_ry": 11,
        "head_r": 5.5,
        "shoulders": 1.05,
        "style": "player",
    },
    {
        "id": "a-jie",
        "name_zh": "阿傑",
        "body": (106, 138, 112, 255),  # #6a8a70
        "head": (28, 32, 28, 255),
        "skin": (210, 195, 170, 255),
        "accent": (90, 120, 95, 255),
        "body_rx": 9,
        "body_ry": 10.5,
        "head_r": 5.2,
        "shoulders": 1.0,
        "style": "normal",
    },
    {
        "id": "xu-man",
        "name_zh": "許曼",
        "body": (138, 106, 128, 255),  # #8a6a80
        "head": (36, 28, 34, 255),
        "skin": (220, 200, 190, 255),
        "accent": (120, 90, 110, 255),  # sleeve-tight darker bands
        "body_rx": 7.5,
        "body_ry": 10,
        "head_r": 5.0,
        "shoulders": 0.82,  # narrower shoulders
        "style": "slim",
    },
    {
        "id": "zhou-lang",
        "name_zh": "周朗",
        "body": (106, 122, 144, 255),  # #6a7a90
        "head": (28, 30, 36, 255),
        "skin": (200, 190, 175, 255),
        "accent": (80, 95, 115, 255),
        "body_rx": 11,
        "body_ry": 12,
        "head_r": 5.8,
        "shoulders": 1.2,  # bulkier
        "style": "bulky",
    },
    {
        "id": "a-cheng",
        "name_zh": "阿成",
        "body": (138, 122, 96, 255),  # #8a7a60
        "head": (40, 34, 28, 255),
        "skin": (215, 200, 175, 255),
        "accent": (110, 95, 70, 255),
        "body_rx": 9,
        "body_ry": 10.5,
        "head_r": 5.2,
        "shoulders": 1.0,
        "style": "office",
    },
    {
        "id": "e-jie",
        "name_zh": "娥姐",
        "body": (138, 122, 96, 255),  # #8a7a60 base
        "head": (48, 36, 30, 255),
        "skin": (225, 205, 185, 255),
        "accent": (196, 120, 90, 255),  # #c4785a apron
        "body_rx": 9.5,
        "body_ry": 11,
        "head_r": 5.4,
        "shoulders": 1.05,
        "style": "apron",
    },
    {
        "id": "dr-zhang",
        "name_zh": "張醫生",
        "body": (106, 138, 154, 255),  # #6a8a9a outer
        "head": (32, 36, 40, 255),
        "skin": (215, 205, 195, 255),
        "accent": (220, 228, 232, 255),  # lighter coat torso
        "body_rx": 9,
        "body_ry": 11,
        "head_r": 5.2,
        "shoulders": 1.0,
        "style": "coat",
    },
    {
        "id": "alienated-crew",
        "name_zh": "異化船員／異化者",
        "body": (90, 64, 56, 255),  # #5a4038
        "head": (50, 40, 36, 255),
        "skin": (74, 56, 48, 255),
        "accent": (74, 56, 48, 255),  # #4a3830
        "accent2": (90, 95, 60, 255),  # muted olive-brown distortion
        "body_rx": 10,
        "body_ry": 11.5,
        "head_r": 5.5,
        "shoulders": 1.1,
        "style": "alienated",
    },
]


def hex_note(rgba: tuple[int, int, int, int]) -> str:
    return f"#{rgba[0]:02x}{rgba[1]:02x}{rgba[2]:02x}"


def rot(px: float, py: float, ang: float) -> tuple[float, float]:
    c, s = math.cos(ang), math.sin(ang)
    return px * c - py * s, px * s + py * c


def poly(cx: float, cy: float, pts: list[tuple[float, float]], ang: float) -> list[tuple[float, float]]:
    out = []
    for x, y in pts:
        rx, ry = rot(x, y, ang)
        out.append((cx + rx, cy + ry))
    return out


def darken(c: tuple[int, int, int, int], f: float = 0.75) -> tuple[int, int, int, int]:
    return (int(c[0] * f), int(c[1] * f), int(c[2] * f), c[3])


def lighten(c: tuple[int, int, int, int], f: float = 1.15) -> tuple[int, int, int, int]:
    return (min(255, int(c[0] * f)), min(255, int(c[1] * f)), min(255, int(c[2] * f)), c[3])


def draw_ellipse(draw: ImageDraw.ImageDraw, cx: float, cy: float, rx: float, ry: float, fill, outline=None):
    draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=fill, outline=outline)


def walk_offsets(frame: int | None) -> dict:
    """Subtle bob + stride for walk frames 0..3. Idle (None) = zeros."""
    if frame is None:
        return {"bob": 0.0, "stride": 0.0, "sway": 0.0, "phase": 0.0}
    # 0 contact L-fwd, 1 pass, 2 contact R-fwd, 3 pass
    bob = [0.0, -1.5, 0.0, -1.5][frame]
    stride = [1.4, 0.7, -1.4, -0.7][frame]  # + = left side forward along facing
    sway = [-1.2, -0.7, 1.2, 0.7][frame]  # shoulder counter-sway (left end)
    phase = frame * 0.9
    return {"bob": bob, "stride": stride, "sway": sway, "phase": phase}



def _draw_walk_feet(draw, cx, cy, fx, fy, lx, ly, brx, bry, body, wo):
    """Foot ellipses near rear of silhouette; stride makes L/R frames differ."""
    foot = darken(body, 0.5)
    lf = wo["stride"]
    rf = -wo["stride"]
    back = bry * 0.72
    lat = brx * 0.72
    for side, stride_amt in ((1, lf), (-1, rf)):
        px = cx - fx * (back - stride_amt * 1.6) + lx * (lat * side) + fx * (stride_amt * 0.15)
        py = cy - fy * (back - stride_amt * 1.6) + ly * (lat * side) + fy * (stride_amt * 0.15)
        draw_ellipse(draw, px, py, 2.6, 1.8, (*foot[:3], 220))


def draw_person_cell(
    img: Image.Image,
    ox: int,
    oy: int,
    ch: dict,
    direction: str,
    walk_frame: int | None = None,
) -> None:
    draw = ImageDraw.Draw(img, "RGBA")
    wo = walk_offsets(walk_frame)
    cx = ox + CELL / 2
    cy = oy + CELL / 2 + 1 + wo["bob"]  # slight downward bias + walk bob
    ang = DIR_ANGLE[direction]
    style = ch["style"]
    body = ch["body"]
    head = ch["head"]
    skin = ch["skin"]
    accent = ch["accent"]
    brx = ch["body_rx"] * ch["shoulders"]
    bry = ch["body_ry"]
    hr = ch["head_r"]

    # Facing unit (forward = nose / toes direction in top-down)
    fx, fy = math.cos(ang), math.sin(ang)
    # Perpendicular for shoulders (left relative to facing)
    lx, ly = -fy, fx

    # Soft drop shadow (stays near feet; less bob than body)
    shadow = (0, 0, 0, 70)
    sh_y = oy + CELL / 2 + 1 + bry * 0.75 + 2 + wo["bob"] * 0.35
    draw_ellipse(draw, ox + CELL / 2 + 1, sh_y, brx * 0.95, 3.2, shadow)


    if style == "alienated":
        # Irregular blob body — still readable as person
        a2 = ch.get("accent2", accent)
        blob = []
        for i in range(10):
            t = i / 10 * math.pi * 2
            wobble = 1.0 + 0.18 * math.sin(i * 2.7 + 0.4 + wo["phase"]) + 0.08 * math.cos(i * 1.3 + wo["phase"] * 0.7)
            # Elongate slightly along facing so direction reads
            rr = (brx * abs(math.cos(t)) + bry * abs(math.sin(t))) * wobble
            # Bias blob toward facing
            bx = math.cos(t) * rr * 0.92 + fx * 1.5
            by = math.sin(t) * rr * 0.92 + fy * 1.5
            blob.append((cx + bx, cy + by))
        draw.polygon(blob, fill=body)
        # Distortion patches (non-gory olive-brown)
        for off, scale in [((2.5, -1.5), 3.2), ((-2.0, 2.0), 2.6), ((1.0, 3.0), 2.2)]:
            px = cx + off[0] * lx + off[1] * fx
            py = cy + off[0] * ly + off[1] * fy
            draw_ellipse(draw, px, py, scale, scale * 0.7, (*a2[:3], 200))
        # Secondary dull patch
        draw_ellipse(
            draw,
            cx - fx * 2.5 + lx * 3,
            cy - fy * 2.5 + ly * 3,
            2.8,
            2.2,
            (*accent[:3], 180),
        )
        # Head (slightly irregular)
        hx, hy = cx + fx * 1.5, cy + fy * 1.5
        head_pts = []
        for i in range(8):
            t = i / 8 * math.pi * 2
            rr = hr * (1.0 + 0.12 * math.sin(i * 1.9))
            head_pts.append((hx + math.cos(t) * rr, hy + math.sin(t) * rr))
        draw.polygon(head_pts, fill=head)
        # Muted face cue (no gore) — pale wedge + shoulder bar for facing
        nose = poly(
            hx,
            hy,
            [(hr * 0.15, -hr * 0.4), (hr * 1.35, 0), (hr * 0.15, hr * 0.4)],
            ang,
        )
        draw.polygon(nose, fill=(*skin[:3], 220))
        # Dull shoulder bar perpendicular to facing (+ walk sway)
        sh = darken(body, 0.65)
        sw = wo["sway"]
        draw.line(
            [
                (cx + lx * (brx * 0.85) - fx * 1.0 + fx * sw * 0.3, cy + ly * (brx * 0.85) - fy * 1.0 + fy * sw * 0.3),
                (cx - lx * (brx * 0.85) - fx * 1.0 - fx * sw * 0.3, cy - ly * (brx * 0.85) - fy * 1.0 - fy * sw * 0.3),
            ],
            fill=sh,
            width=2,
        )
        if walk_frame is not None:
            _draw_walk_feet(draw, cx, cy, fx, fy, lx, ly, brx, bry, body, wo)
        return

    # --- Normal / styled characters ---
    # Body oval (shoulders wider on bulky, narrower on slim)
    if style == "bulky":
        # Slight rounded-rect feel via overlapping ellipses
        draw_ellipse(draw, cx - lx * 2.5, cy - ly * 2.5, brx * 0.7, bry * 0.85, body)
        draw_ellipse(draw, cx + lx * 2.5, cy + ly * 2.5, brx * 0.7, bry * 0.85, body)
        draw_ellipse(draw, cx, cy, brx * 0.95, bry, body)
    elif style == "slim":
        draw_ellipse(draw, cx, cy, brx, bry, body)
        # Sleeve-tight darker bands on sides
        draw_ellipse(
            draw,
            cx + lx * (brx * 0.75),
            cy + ly * (brx * 0.75),
            2.0,
            bry * 0.55,
            darken(accent, 0.9),
        )
        draw_ellipse(
            draw,
            cx - lx * (brx * 0.75),
            cy - ly * (brx * 0.75),
            2.0,
            bry * 0.55,
            darken(accent, 0.9),
        )
    elif style == "coat":
        # Outer coat color, lighter torso panel
        draw_ellipse(draw, cx, cy, brx, bry, body)
        draw_ellipse(draw, cx + fx * 0.5, cy + fy * 0.5, brx * 0.55, bry * 0.7, accent)
        # Coat lapel line (darker strip)
        lapel = poly(
            cx,
            cy,
            [(-1.2, -bry * 0.5), (1.2, -bry * 0.5), (0.5, bry * 0.55), (-0.5, bry * 0.55)],
            ang,
        )
        draw.polygon(lapel, fill=lighten(body, 1.25))
    elif style == "apron":
        draw_ellipse(draw, cx, cy, brx, bry, body)
        # Warm apron panel on FRONT (local +x = facing) — larger, readable at 32px
        apron = poly(
            cx,
            cy,
            [
                (-bry * 0.35, -brx * 0.7),
                (bry * 0.85, -brx * 0.55),
                (bry * 0.85, brx * 0.55),
                (-bry * 0.35, brx * 0.7),
            ],
            ang,
        )
        draw.polygon(apron, fill=accent)
        # Apron straps from shoulders toward front
        draw.line(
            [
                (cx - lx * 3.2 - fx * 1.5, cy - ly * 3.2 - fy * 1.5),
                (cx + fx * (bry * 0.35), cy + fy * (bry * 0.35)),
            ],
            fill=darken(accent, 0.85),
            width=2,
        )
        draw.line(
            [
                (cx + lx * 3.2 - fx * 1.5, cy + ly * 3.2 - fy * 1.5),
                (cx + fx * (bry * 0.35), cy + fy * (bry * 0.35)),
            ],
            fill=darken(accent, 0.85),
            width=2,
        )
    elif style == "office":
        draw_ellipse(draw, cx, cy, brx, bry, body)
        # Collar / shirt peek
        draw_ellipse(draw, cx + fx * 1.5, cy + fy * 1.5, 3.5, 3.0, lighten(skin, 1.05))
    elif style == "player":
        draw_ellipse(draw, cx, cy, brx, bry, body)
        # Slight highlight on body so player reads brighter
        draw_ellipse(draw, cx - fx * 1.5, cy - fy * 1.5, brx * 0.45, bry * 0.4, lighten(body, 1.12))
    else:
        draw_ellipse(draw, cx, cy, brx, bry, body)

    # Shoulder line cue (perpendicular to facing) — darker stripe + walk sway
    sh_col = darken(body, 0.72)
    sh_w = brx * 0.95
    sw = wo["sway"]
    p1 = (cx + lx * sh_w - fx * 1.5 + fx * sw * 0.4, cy + ly * sh_w - fy * 1.5 + fy * sw * 0.4)
    p2 = (cx - lx * sh_w - fx * 1.5 - fx * sw * 0.4, cy - ly * sh_w - fy * 1.5 - fy * sw * 0.4)
    draw.line([p1, p2], fill=sh_col, width=2)

    # Head disc (slightly offset toward facing so facing is clear)
    hx = cx + fx * 2.0
    hy = cy + fy * 2.0
    draw_ellipse(draw, hx, hy, hr, hr, head)

    # Hair bang / hair cue on back of head (opposite facing) for most chars
    bang_col = darken(head, 0.85) if style != "player" else (55, 42, 30, 255)
    if style == "xu-man" or style == "slim":
        # Longer bang fringe toward face
        bang = poly(
            hx,
            hy,
            [(-hr * 0.9, -hr * 0.35), (-hr * 0.1, -hr * 1.05), (hr * 0.55, -hr * 0.5)],
            ang + math.pi,  # bang sits on back/top relative to face? For top-down hair sits opposite feet... 
        )
        # Hair toward back (opposite facing)
        bang = poly(
            hx,
            hy,
            [
                (-hr * 0.85, hr * 0.15),
                (0, hr * 1.05),
                (hr * 0.85, hr * 0.15),
                (hr * 0.5, -hr * 0.2),
                (-hr * 0.5, -hr * 0.2),
            ],
            ang + math.pi,  # rotate so "up" in local = opposite facing
        )
        draw.polygon(bang, fill=bang_col)
    elif style == "apron":
        # Bun / hair knot at back
        draw_ellipse(
            draw,
            hx - fx * (hr + 1.5),
            hy - fy * (hr + 1.5),
            2.8,
            2.5,
            bang_col,
        )
    else:
        # Short hair cap toward back
        draw_ellipse(
            draw,
            hx - fx * (hr * 0.35),
            hy - fy * (hr * 0.35),
            hr * 0.95,
            hr * 0.75,
            bang_col,
        )

    # Nose / face wedge pointing in facing direction (skin tone)
    nose = poly(
        hx,
        hy,
        [
            (hr * 0.15, -hr * 0.35),
            (hr * 1.15, 0),
            (hr * 0.15, hr * 0.35),
        ],
        ang,
    )
    draw.polygon(nose, fill=skin)

    # Tiny eye dots flanking nose (helps direction at small size)
    ex, ey = rot(hr * 0.35, -hr * 0.45, ang)
    draw_ellipse(draw, hx + ex, hy + ey, 1.1, 1.1, (20, 18, 16, 230))
    ex2, ey2 = rot(hr * 0.35, hr * 0.45, ang)
    draw_ellipse(draw, hx + ex2, hy + ey2, 1.1, 1.1, (20, 18, 16, 230))

    # Player: brighter rim so they stand out
    if style == "player":
        rim = poly(
            hx,
            hy,
            [(hr * 0.9, -hr * 0.2), (hr * 1.35, 0), (hr * 0.9, hr * 0.2)],
            ang,
        )
        draw.polygon(rim, fill=lighten(skin, 1.08))

    if walk_frame is not None:
        _draw_walk_feet(draw, cx, cy, fx, fy, lx, ly, brx, bry, body, wo)


def make_idle_sheet(ch: dict) -> Path:
    sheet = Image.new("RGBA", (CELL * 8, CELL), (0, 0, 0, 0))
    for i, d in enumerate(DIRS):
        draw_person_cell(sheet, i * CELL, 0, ch, d, walk_frame=None)
    path = OUT_DIR / f"{ch['id']}-idle-8dir.png"
    sheet.save(path, "PNG")
    return path


def make_walk_sheet(ch: dict) -> Path:
    """Grid: columns = 8 directions, rows = walk frames 0..3 → 256×128."""
    sheet = Image.new("RGBA", (CELL * 8, CELL * WALK_FRAMES), (0, 0, 0, 0))
    for row in range(WALK_FRAMES):
        for col, d in enumerate(DIRS):
            draw_person_cell(sheet, col * CELL, row * CELL, ch, d, walk_frame=row)
    path = OUT_DIR / f"{ch['id']}-walk-8dir.png"
    sheet.save(path, "PNG")
    return path


def write_readme() -> Path:
    lines = [
        "# Sprite sheets — 《無菌室》",
        "",
        "## Direction order (columns, left → right)",
        "",
        "`N, NE, E, SE, S, SW, W, NW`",
        "",
        "## Idle sheets (`{id}-idle-8dir.png`)",
        "",
        f"- Cell: **{CELL}×{CELL}** px",
        f"- Sheet: **{CELL * 8}×{CELL}** px (1 row × 8 directions)",
        "- Format: PNG RGBA (transparent background)",
        "- Frame type: idle (single frame × 8 directions)",
        "- **Idle sheets are unchanged** by walk generation; regenerate both via the script.",
        "",
        "## Walk sheets (`{id}-walk-8dir.png`)",
        "",
        f"- Cell: **{CELL}×{CELL}** px",
        f"- Sheet: **{CELL * 8}×{CELL * WALK_FRAMES}** px (**{CELL * 8}×{CELL * WALK_FRAMES}**)",
        f"- Layout: **columns = directions (8)**, **rows = walk frames (0..{WALK_FRAMES - 1})**",
        f"- Frame count: **{WALK_FRAMES}** walk frames per direction",
        "- Frame meaning:",
        "  - row 0: contact (left foot forward)",
        "  - row 1: passing / mid-stride (body bob up)",
        "  - row 2: contact (right foot forward)",
        "  - row 3: passing / mid-stride (body bob up)",
        "- Animation: subtle body bob + alternating foot markers + shoulder sway; facing cues stay clear",
        "- Format: PNG RGBA (transparent background)",
        "",
        "## Character id → Chinese name",
        "",
        "| id | Chinese | Body color | Idle | Walk |",
        "|----|---------|------------|------|------|",
    ]
    for ch in CHARACTERS:
        cid = ch["id"]
        lines.append(
            f"| `{cid}` | {ch['name_zh']} | `{hex_note(ch['body'])}` "
            f"| `{cid}-idle-8dir.png` | `{cid}-walk-8dir.png` |"
        )
    lines += [
        "",
        "## Silhouette notes",
        "",
        "- **liang-zi-an**: warmer/brighter body, slight highlight, clearer nose rim",
        "- **xu-man**: narrower shoulders + sleeve-tight side bands",
        "- **zhou-lang**: bulkier overlapping shoulder ellipses",
        "- **dr-zhang**: lighter coat torso / lapel panel",
        "- **e-jie**: warm `#c4785a` apron panel + straps",
        "- **alienated-crew**: irregular blob edges, dull olive-brown distortion (non-gory); walk wobble phase shifts with frame",
        "",
        "## Generator",
        "",
        "Run: `python3 _gen_sprites.py`",
        "",
        "Regenerates all idle and walk sheets plus this README.",
        "",
    ]
    path = OUT_DIR / "README.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    idle_paths = [make_idle_sheet(ch) for ch in CHARACTERS]
    walk_paths = [make_walk_sheet(ch) for ch in CHARACTERS]
    readme = write_readme()
    print("Generated idle:")
    for p in idle_paths:
        im = Image.open(p)
        print(f"  {p}  size={im.size} mode={im.mode}")
    print("Generated walk:")
    for p in walk_paths:
        im = Image.open(p)
        print(f"  {p}  size={im.size} mode={im.mode}")
    print(f"  {readme}")


if __name__ == "__main__":
    main()
