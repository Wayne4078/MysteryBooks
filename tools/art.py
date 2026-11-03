# 그림 한 장 들이기 — python3 tools/art.py <책> <이름> <Recraft 이미지 주소>
# 내려받아 흑백·720×960 안팎·webp로 줄여 art/<책>/<이름>.webp 에 둔다. 원본은 art/_src/ 에 (저장소에는 안 올림)
import sys, os, urllib.request
from PIL import Image
book, name, url = sys.argv[1], sys.argv[2], sys.argv[3]
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
src = os.path.join(root, 'art', '_src', f'{book}-{name}.img'); os.makedirs(os.path.dirname(src), exist_ok=True)
urllib.request.urlretrieve(url, src)
im = Image.open(src).convert('L'); im.thumbnail((720, 960))
out = os.path.join(root, 'art', book, f'{name}.webp'); os.makedirs(os.path.dirname(out), exist_ok=True)
im.save(out, 'WEBP', quality=78, method=6)
print(out, im.size, os.path.getsize(out) // 1024, 'KB')
