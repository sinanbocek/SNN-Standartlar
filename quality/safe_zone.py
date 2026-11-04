"""Görseli ya da videoyu sosyal medya ölçüleriyle işaretler; sahibe göstermeden önce denetim içindir.

Kullanım: python -I safe_zone.py cikti.jpg <dosya.png|dosya.mp4[@saniye]> [...]
Mor dolgu: Meta reklam bölgesi. Kırmızı çerçeve: canlı ölçülen arayüz.
Mavi çerçeve: kırpılan kenar (uzun ekran, profil ızgarası).
Kural ve kanıt türleri: standartlar/sosyal-medya-olcu-standardi.md
Ölçüler: quality/data/social-media-sizes.json
Gerekenler: Pillow; video için ffmpeg."""
import json
import os
import re
import subprocess
import sys
import tempfile

try:
    from PIL import Image, ImageDraw
except ImportError:
    raise SystemExit('Pillow kurulu değil. Kur: python -m pip install pillow')

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'social-media-sizes.json')
CELL_WIDTH = 360
RESERVED_FILL = (124, 92, 255, 80)
LIVE_OUTLINE = (235, 50, 60)
CROP_OUTLINE = (40, 120, 255)


def load_canvases(path=DATA_FILE):
    with open(path, encoding='utf-8') as handle:
        return json.load(handle)['canvases']


def parse_spec(spec):
    """'video.mp4@9' -> ('video.mp4', '9'). Yolun kendisinde @ olabilir; yalnız sondaki sayı saniyedir."""
    match = re.fullmatch(r'(.+)@(\d+(?:\.\d+)?)', spec)
    return (match.group(1), match.group(2)) if match else (spec, None)


def find_canvas(size, canvases):
    """Oranı tutan ölçüyü döndürür: 1440x2560 da 9:16 sayılır. Tutmuyorsa durur; yanlış ölçüyle işaretlemez."""
    width, height = size
    for canvas in canvases:
        if width * canvas['height'] == height * canvas['width']:
            return canvas
    known = ', '.join(f"{c['width']}x{c['height']}" for c in canvases)
    raise SystemExit(f'Bilinen orana uymuyor: {width}x{height}. Bilinenler: {known}')


def read_frame(spec):
    path, seconds = parse_spec(spec)
    if not path.lower().endswith('.mp4'):
        return Image.open(path).convert('RGB')
    handle, frame_path = tempfile.mkstemp(suffix='.png')
    os.close(handle)
    try:
        subprocess.run(
            ['ffmpeg', '-y', '-v', 'error', '-ss', seconds or '1', '-i', path, '-frames:v', '1', frame_path],
            check=True,
        )
        frame = Image.open(frame_path).convert('RGB')
        frame.load()
        return frame
    except FileNotFoundError:
        raise SystemExit('ffmpeg bulunamadı; video karesi alınamadı.')
    except subprocess.CalledProcessError:
        raise SystemExit(f'Kare alınamadı: {spec}')
    finally:
        os.remove(frame_path)


def mark(image, canvases):
    canvas = find_canvas(image.size, canvases)
    scaled = image.resize((canvas['width'], canvas['height']))
    overlay = Image.new('RGBA', scaled.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    # Sıra bilerek böyle: dolgu çerçevelerin altında kalır. Canlı arayüz en üste çizilir, çünkü
    # reels-top ile cover-grid-top aynı kutudur ve kırmızı görünmek zorundadır.
    for zone in canvas['zones']:
        if zone['kind'] == 'reserved':
            draw.rectangle(_inclusive(zone['box']), fill=RESERVED_FILL)
    for kind, outline in (('crop', CROP_OUTLINE), ('live', LIVE_OUTLINE)):
        for zone in canvas['zones']:
            if zone['kind'] == kind:
                draw.rectangle(_inclusive(zone['box']), outline=outline, width=6)
    return Image.alpha_composite(scaled.convert('RGBA'), overlay).convert('RGB')


def _inclusive(box):
    # Veri dosyasında sağ ve alt kenar dahil değildir; Pillow dahil sayar.
    left, top, right, bottom = box
    return (left, top, right - 1, bottom - 1)


def main(output, specs, canvases=None):
    canvases = canvases or load_canvases()
    # Argüman sırası karışırsa kaynak dosya ezilmesin.
    sources = {os.path.abspath(parse_spec(spec)[0]) for spec in specs}
    if os.path.abspath(output) in sources:
        raise SystemExit(f'Çıktı girdinin üstüne yazılamaz: {output}')
    marked = [mark(read_frame(spec), canvases) for spec in specs]
    heights = [round(CELL_WIDTH * im.height / im.width) for im in marked]
    sheet = Image.new('RGB', (CELL_WIDTH * len(marked), max(heights)), 'white')
    for index, (im, height) in enumerate(zip(marked, heights)):
        sheet.paste(im.resize((CELL_WIDTH, height)), (index * CELL_WIDTH, 0))
    sheet.save(output, quality=85)


if __name__ == '__main__':
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2:])
