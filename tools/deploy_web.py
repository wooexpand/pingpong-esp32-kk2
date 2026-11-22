"""Copy web/dist to esp32/data for the PlatformIO filesystem image."""
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
