#!/usr/bin/env python3
"""Reproduce /napryamky phone review assets from the existing approved scene masters.

Crop only: source (627, 0, 1881, 836), the right two thirds at 3:2; no generated pixels.
480/960 px WebP q82 and AVIF q58, content-hashed for the existing media-responsive cache.
Run from anywhere with Pillow (including AVIF support). Update mobileSources in
app/data/directionsHeroSequenceManifest.ts only if the emitted content hashes change.
The source masters and all desktop/tablet files stay untouched.
"""
from PIL import Image
from pathlib import Path
import hashlib,io,json
root = Path(__file__).resolve().parents[1]
subjects=['angary','zernoskhovyshcha','metalokonstruktsii','betonni-roboty','pokrivelni-roboty']
results={}
for theme in ['daylight','blue-hour']:
 for subject in subjects:
  src=root/'design-assets/directions-sequence-concepts'/theme/(subject+'.png')
  im=Image.open(src).convert('RGB').crop((627,0,1881,836))
  record={'source':str(src.relative_to(root)),'crop':[627,0,1881,836],'variants':{}}
  for fmt in ['AVIF','WEBP']:
   variants=[]
   for width in [480,960]:
    resized=im.resize((width,round(width*im.height/im.width)),Image.Resampling.LANCZOS)
    b=io.BytesIO()
    if fmt=='AVIF':resized.save(b,fmt,quality=58,speed=4)
    else:resized.save(b,fmt,quality=82,method=6)
    data=b.getvalue();digest=hashlib.sha256(data).hexdigest()[:8]
    name=f'mobile-directions-{theme}-{subject}-{width}w.{digest}.{fmt.lower()}'
    (root/'public/media-responsive'/name).write_bytes(data)
    variants.append({'path':'/media-responsive/'+name,'width':width,'height':resized.height,'bytes':len(data)})
   record['variants'][fmt.lower()]=variants
  results[f'{theme}/{subject}']=record
print(json.dumps(results, indent=2))
print(json.dumps({k:{fmt:sum(v['bytes'] for v in val['variants'][fmt]) for fmt in ['avif','webp']} for k,val in results.items()},indent=2))
print('total bytes',sum(v['bytes'] for val in results.values() for vs in val['variants'].values() for v in vs))
