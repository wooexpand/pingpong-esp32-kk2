"""Kopiera web/dist till esp32/data för PlatformIO Upload Filesystem Image.
(把 web/dist 复制到 esp32/data，供 PlatformIO 烧录文件系统镜像。)"""
from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1]
src=root/'web'/'dist'
dest=root/'esp32'/'data'
if not (src/'index.html').exists():
    raise SystemExit('Missing web/dist/index.html. Run npm run build in web first.')
for item in dest.iterdir():
    if item.is_dir(): shutil.rmtree(item)
    else: item.unlink()
for item in src.iterdir():
    d=dest/item.name
    if item.is_dir(): shutil.copytree(item,d)
    else: shutil.copy2(item,d)
print('Copied React build into', dest)
print('Next: PlatformIO -> Upload Filesystem Image (pio run -t uploadfs)')
