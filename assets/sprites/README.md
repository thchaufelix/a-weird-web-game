# Sprite sheets — 《無菌室》

## Direction order (columns, left → right)

`N, NE, E, SE, S, SW, W, NW`

## Idle sheets (`{id}-idle-8dir.png`)

- Cell: **32×32** px
- Sheet: **256×32** px (1 row × 8 directions)
- Format: PNG RGBA (transparent background)
- Frame type: idle (single frame × 8 directions)
- **Idle sheets are unchanged** by walk generation; regenerate both via the script.

## Walk sheets (`{id}-walk-8dir.png`)

- Cell: **32×32** px
- Sheet: **256×128** px
- Layout: **columns = directions (8)**, **rows = walk frames (0..3)**
- Frame count: **4** walk frames per direction
- Frame meaning:
  - row 0: contact (left foot forward)
  - row 1: passing / mid-stride (body bob up)
  - row 2: contact (right foot forward)
  - row 3: passing / mid-stride (body bob up)
- Animation: subtle body bob + alternating foot markers + shoulder sway; facing cues stay clear
- Format: PNG RGBA (transparent background)

## Character id → Chinese name

| id | Chinese | Body color | Idle | Walk |
|----|---------|------------|------|------|
| `liang-zi-an` | 梁子安 | `#c4a574` | `liang-zi-an-idle-8dir.png` | `liang-zi-an-walk-8dir.png` |
| `a-jie` | 阿傑 | `#6a8a70` | `a-jie-idle-8dir.png` | `a-jie-walk-8dir.png` |
| `xu-man` | 許曼 | `#8a6a80` | `xu-man-idle-8dir.png` | `xu-man-walk-8dir.png` |
| `zhou-lang` | 周朗 | `#6a7a90` | `zhou-lang-idle-8dir.png` | `zhou-lang-walk-8dir.png` |
| `a-cheng` | 阿成 | `#8a7a60` | `a-cheng-idle-8dir.png` | `a-cheng-walk-8dir.png` |
| `e-jie` | 娥姐 | `#8a7a60` | `e-jie-idle-8dir.png` | `e-jie-walk-8dir.png` |
| `dr-zhang` | 張醫生 | `#6a8a9a` | `dr-zhang-idle-8dir.png` | `dr-zhang-walk-8dir.png` |
| `alienated-crew` | 異化船員／異化者 | `#5a4038` | `alienated-crew-idle-8dir.png` | `alienated-crew-walk-8dir.png` |

## Silhouette notes

- **liang-zi-an**: warmer/brighter body, slight highlight, clearer nose rim
- **xu-man**: narrower shoulders + sleeve-tight side bands
- **zhou-lang**: bulkier overlapping shoulder ellipses
- **dr-zhang**: lighter coat torso / lapel panel
- **e-jie**: warm `#c4785a` apron panel + straps
- **alienated-crew**: irregular blob edges, dull olive-brown distortion (non-gory); walk wobble phase shifts with frame

## Generator

Run: `python3 _gen_sprites.py`

Regenerates all idle and walk sheets plus this README.
