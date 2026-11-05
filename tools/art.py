# 그림 한 장 들이기 — python3 tools/art.py <책> <이름> <Recraft 이미지 주소>
# 넷째 칸(꼴): 비우면 보통 그림. stamp = 선화를 금박 압인용 본(선만 남긴 투명 그림)으로, alpha = 배경을 딴 그림을 투명 그대로(핸드북 표지처럼 종이에 바로 인쇄).
# 내려받아 흑백·720×960 안팎(작은 컷은 4:3으로 뽑으면 720×540)·webp로 줄여 art/<책>/<이름>.webp 에 둔다. 원본은 art/_src/ 에 (저장소에는 안 올림)
import sys, os, urllib.request
from PIL import Image
book, name, url = sys.argv[1], sys.argv[2], sys.argv[3]
mode = sys.argv[4] if len(sys.argv) > 4 else ''
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
src = os.path.join(root, 'art', '_src', f'{book}-{name}.img'); os.makedirs(os.path.dirname(src), exist_ok=True)
if url != '-': urllib.request.urlretrieve(url, src)  # '-' 이면 받아 둔 원본으로 다시 만든다
out = os.path.join(root, 'art', book, f'{name}.webp'); os.makedirs(os.path.dirname(out), exist_ok=True)
if mode == 'stamp':
    from PIL import ImageOps
    g = ImageOps.autocontrast(Image.open(src).convert('L'))
    a = g.point(lambda v: 255 - v)                       # 검은 선 = 금박이 앉는 곳
    a = a.crop(a.point(lambda v: 255 if v > 60 else 0).getbbox())
    if a.width < 600: a = a.resize((a.width * 2, a.height * 2), Image.LANCZOS)  # 표지에선 크게 보이니 선이 무르지 않게
    a.thumbnail((720, 960)); im = Image.new('LA', a.size, 0); im.putalpha(a)
    im.save(out, 'WEBP', lossless=True, method=6)
elif mode == 'alpha':
    im = Image.open(src).convert('RGBA'); im = im.crop(im.getchannel('A').getbbox()); im.thumbnail((720, 960))
    L = im.convert('L'); im = Image.merge('LA', (L, im.getchannel('A')))
    im.save(out, 'WEBP', quality=80, method=6)
else:
    im = Image.open(src).convert('L'); im.thumbnail((720, 960))
    im.save(out, 'WEBP', quality=78, method=6)
print(out, im.size, os.path.getsize(out) // 1024, 'KB')
