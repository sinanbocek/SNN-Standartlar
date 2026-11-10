"""Güvenli bölge aracının testleri. Çalıştır: python quality/test/safe_zone_test.py"""
import os
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

from PIL import Image  # noqa: E402

import safe_zone  # noqa: E402

GREY = (120, 120, 120)


def zone_box(zone_id):
    for canvas in safe_zone.load_canvases():
        for zone in canvas['zones']:
            if zone['id'] == zone_id:
                return zone['box']
    raise KeyError(zone_id)


class ParseSpec(unittest.TestCase):
    def test_second_suffix(self):
        self.assertEqual(safe_zone.parse_spec('video.mp4@9'), ('video.mp4', '9'))
        self.assertEqual(safe_zone.parse_spec('video.mp4@1.5'), ('video.mp4', '1.5'))

    def test_without_suffix(self):
        self.assertEqual(safe_zone.parse_spec('kart.png'), ('kart.png', None))

    def test_at_sign_inside_path_is_not_second(self):
        self.assertEqual(safe_zone.parse_spec('a@b/kart.png'), ('a@b/kart.png', None))


class FindCanvas(unittest.TestCase):
    def setUp(self):
        self.canvases = safe_zone.load_canvases()

    def test_known_sizes(self):
        self.assertEqual(safe_zone.find_canvas((1080, 1920), self.canvases)['id'], 'vertical')
        self.assertEqual(safe_zone.find_canvas((1080, 1350), self.canvases)['id'], 'post')

    def test_meta_large_size_counts_as_vertical(self):
        self.assertEqual(safe_zone.find_canvas((1440, 2560), self.canvases)['id'], 'vertical')

    def test_unknown_ratio_stops(self):
        with self.assertRaises(SystemExit):
            safe_zone.find_canvas((1080, 1080), self.canvases)


class Mark(unittest.TestCase):
    def setUp(self):
        self.canvases = safe_zone.load_canvases()

    def test_vertical_zones_are_drawn(self):
        marked = safe_zone.mark(Image.new('RGB', (1080, 1920), GREY), self.canvases)
        self.assertNotEqual(marked.getpixel((540, 100)), GREY, 'üst reklam bölgesi boyanmalı')
        self.assertNotEqual(marked.getpixel((540, 1500)), GREY, 'alt reklam bölgesi boyanmalı')
        self.assertEqual(marked.getpixel((540, 800)), GREY, 'orta temiz kalmalı')

    def test_reserved_edges_match_data(self):
        marked = safe_zone.mark(Image.new('RGB', (1080, 1920), GREY), self.canvases)
        top = zone_box('meta-ad-top')[3]
        bottom = zone_box('meta-ad-bottom')[1]
        self.assertNotEqual(marked.getpixel((540, top - 1)), GREY)
        self.assertEqual(marked.getpixel((540, top)), GREY)
        self.assertEqual(marked.getpixel((540, bottom - 1)), GREY)
        self.assertNotEqual(marked.getpixel((540, bottom)), GREY)

    def test_live_outline_is_red(self):
        marked = safe_zone.mark(Image.new('RGB', (1080, 1920), GREY), self.canvases)
        left = zone_box('reels-right-column')[0]
        self.assertEqual(marked.getpixel((left + 2, 1100)), safe_zone.LIVE_OUTLINE)

    def test_live_stays_visible_over_same_crop_box(self):
        self.assertEqual(zone_box('reels-top'), zone_box('cover-grid-top'))
        marked = safe_zone.mark(Image.new('RGB', (1080, 1920), GREY), self.canvases)
        self.assertEqual(marked.getpixel((540, zone_box('reels-top')[3] - 3)), safe_zone.LIVE_OUTLINE)

    def test_post_grid_crop_is_blue(self):
        marked = safe_zone.mark(Image.new('RGB', (1080, 1350), GREY), self.canvases)
        right = zone_box('post-grid-left')[2]
        self.assertEqual(marked.getpixel((right - 3, 675)), safe_zone.CROP_OUTLINE)
        self.assertEqual(marked.getpixel((540, 675)), GREY, 'gönderinin ortası temiz kalmalı')

    def test_large_size_is_scaled(self):
        marked = safe_zone.mark(Image.new('RGB', (1440, 2560), GREY), self.canvases)
        self.assertEqual(marked.size, (1080, 1920))


class EndToEnd(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)

    def path(self, name):
        return os.path.join(self.folder.name, name)

    def image(self, name, size):
        Image.new('RGB', size, GREY).save(self.path(name))
        return self.path(name)

    def test_mixed_sizes_share_one_sheet(self):
        output = self.path('cikti.jpg')
        safe_zone.main(output, [self.image('a.png', (1080, 1920)), self.image('b.png', (1080, 1350))])
        with Image.open(output) as sheet:
            self.assertEqual(sheet.size, (720, 640))

    def test_output_cannot_overwrite_input(self):
        source = self.image('a.png', (1080, 1920))
        with self.assertRaises(SystemExit):
            safe_zone.main(source, [source])
        with self.assertRaises(SystemExit):
            safe_zone.main(source, [source + '@3'])

    def test_video_frame_uses_given_second(self):
        def fake_ffmpeg(command, check):
            Image.new('RGB', (1080, 1920), GREY).save(command[-1])

        output = self.path('cikti.jpg')
        with mock.patch.object(safe_zone.subprocess, 'run', side_effect=fake_ffmpeg) as run:
            safe_zone.main(output, ['video.mp4@9'])
        command = run.call_args[0][0]
        self.assertEqual(command[command.index('-ss') + 1], '9')
        self.assertEqual(command[command.index('-i') + 1], 'video.mp4')
        self.assertFalse(os.path.exists(command[-1]), 'geçici kare silinmeli')

    def test_missing_ffmpeg_gives_clear_stop(self):
        with mock.patch.object(safe_zone.subprocess, 'run', side_effect=FileNotFoundError):
            with self.assertRaises(SystemExit):
                safe_zone.read_frame('video.mp4')


if __name__ == '__main__':
    unittest.main()
