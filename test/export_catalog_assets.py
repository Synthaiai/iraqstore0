"""Copy legacy embedded catalogue photos byte-for-byte into static assets.

Outputs a hash-to-path manifest on stdout; never writes to the live database.
"""
import base64
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

root = Path(__file__).resolve().parent.parent
destination = root / 'public' / 'catalog-images'
destination.mkdir(exist_ok=True)
with urlopen('https://store-29692-default-rtdb.firebaseio.com/products.json', timeout=30) as response:
    products = json.load(response)
manifest = {}
for product in (products or {}).values():
    if not isinstance(product, dict):
        continue
    for image in [*product.get('images', []), product.get('image')]:
        if not isinstance(image, str) or not image.startswith('data:image/'):
            continue
        header, payload = image.split(',', 1)
        extension = {'image/jpeg':'jpg', 'image/jpg':'jpg', 'image/png':'png', 'image/webp':'webp'}.get(header[5:].split(';')[0])
        if not extension or ';base64' not in header:
            continue
        digest = hashlib.sha256(image.encode()).hexdigest()
        filename = f'{digest}.{extension}'
        (destination / filename).write_bytes(base64.b64decode(payload, validate=True))
        manifest[digest] = f'/catalog-images/{filename}'
print(json.dumps(manifest, sort_keys=True, indent=2))
