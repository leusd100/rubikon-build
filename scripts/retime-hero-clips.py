#!/usr/bin/env python3
"""Re-time the desktop hero clips to an even 30 fps at the hero's 0.85 tempo (OD-S1, option B).

HOME (HomeV2HeroMedia) and /pro-nas (AboutHeroVideo) play their desktop clips at playbackRate 0.85: footage shot at
24–30 fps then presents at 20–25 fps, each frame held for 3 vsyncs at 60 Hz, and the camera moves in steps. This
script bakes the 0.85 slow-down into the files instead (setpts), motion-interpolates them to 30 fps (minterpolate)
and pads the tail to the exact re-timed duration, so the components can play them at 1.0 with every frame held for
2 vsyncs and the motion keeps today's tempo.

Encoding matches the shipped clips: H.264 High, CRF 23, preset slow, yuv420p, BT.709, faststart, no audio. Two clips
use CRF 24: at 30 fps welding-v3 came out at 1.80 MB (over the 1.75 MB budget in tests/unit/home-hero-media.test.ts)
and about-floor-plan +21 % over the file it replaces; CRF 24 costs them under one VMAF point (97.7 → 96.7, 93.8 → 92.9
against a lossless render of the same filter chain).
Sources are read from git history, so a run is reproducible from any checkout of the repository:
- HOME: the masters from before #108, cut to the frames the -v2 clips kept (the -v2 files are these frames
  re-encoded at CRF 23; starting from them would add a second CRF 23 generation);
- /pro-nas: the clips as shipped since #32.
The last source frame is cloned twice before the slow-down, so minterpolate runs through to the end and the clip's tail
(the last frame held for its slowed-down duration) stays on the 30 fps grid; the output is checked for that grid.

Run from the repository root: python3 scripts/retime-hero-clips.py [--out DIR] [--jobs N]
"""

import argparse
import json
import os
import struct
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor
from fractions import Fraction


OUT_DIR = "public/media/about"
TEMPO = Fraction(85, 100)
OUT_FPS = 30
CRF = 23
INTERPOLATE = "minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1"

HOME_MASTERS = "9f7e703^"
ABOUT_CLIPS = "69f7c94"

# (output file, git revision, source path, source frames to keep — None keeps them all, CRF)
CLIPS = [
    ("straight-line-14377591-v3.mp4", HOME_MASTERS, "public/media/about/straight-line-14377591.mp4", None, CRF),
    ("blueprint-v3.mp4", HOME_MASTERS, "public/media/about/blueprint.m4v", 80, CRF),
    ("drilling-29913842-v3.mp4", HOME_MASTERS, "public/media/about/drilling-29913842.m4v", 77, CRF),
    ("welding-v3.mp4", HOME_MASTERS, "public/media/about/welding.m4v", 77, 24),
    ("structure-v3.mp4", HOME_MASTERS, "public/media/about/structure.m4v", 77, CRF),
    ("about-precision-9617516-v2.mp4", ABOUT_CLIPS, "public/media/about/about-precision-9617516.mp4", None, CRF),
    ("about-floor-plan-8725798-v2.mp4", ABOUT_CLIPS, "public/media/about/about-floor-plan-8725798.mp4", None, 24),
    ("about-grinder-14488798-v2.mp4", ABOUT_CLIPS, "public/media/about/about-grinder-14488798.mp4", None, CRF),
    ("about-welding-20507417-v2.mp4", ABOUT_CLIPS, "public/media/about/about-welding-20507417.mp4", None, CRF),
    ("about-structure-40721-v2.mp4", ABOUT_CLIPS, "public/media/about/about-structure-40721.mp4", None, CRF),
]


def probe(path: str) -> tuple[Fraction, int]:
    """Frame rate and frame count of the first video stream."""
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_frames",
         "-show_entries", "stream=r_frame_rate,nb_read_frames", "-of", "json", path],
        check=True, capture_output=True, text=True,
    )
    stream = json.loads(result.stdout)["streams"][0]
    return Fraction(stream["r_frame_rate"]), int(stream["nb_read_frames"])


def check_grid(path: str, frames: int) -> None:
    """Every frame one 1/30 s step after the previous one, and exactly `frames` of them."""
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "packet=pts", "-of", "csv=p=0", path],
        check=True, capture_output=True, text=True,
    )
    pts = sorted(int(line) for line in result.stdout.split())
    steps = {b - a for a, b in zip(pts, pts[1:])}
    if len(pts) != frames or len(steps) != 1:
        raise ValueError(f"{path}: {len(pts)} frames (expected {frames}), timestamp steps {sorted(steps)}")


def box_children(data: bytes, start: int, end: int):
    """(type, payload start, box end) of each box between start and end."""
    while start < end:
        size, kind = struct.unpack(">I4s", data[start:start + 8])
        if size < 8:
            raise ValueError(f"unsupported box size {size} at {start}")
        yield kind.decode("latin-1"), start + 8, start + size
        start += size


def trim_edit_list(path: str) -> None:
    """Make the movie, track and edit durations the length of the frames, as in the clips #108 shipped.

    The x264 B-frames start the first frame two frames into the media timeline, and the edit list skips that offset.
    ffmpeg 9 writes the edit (and mvhd/tkhd) as offset + frames, so a browser reports the clip two frames long and
    holds its last frame for those two frames.
    """
    data = bytearray(open(path, "rb").read())
    top = {kind: (begin, end) for kind, begin, end in box_children(data, 0, len(data))}
    moov_begin, moov_end = top["moov"]
    moov = {kind: (begin, end) for kind, begin, end in box_children(data, moov_begin, moov_end)}
    traks = [(begin, end) for kind, begin, end in box_children(data, moov_begin, moov_end) if kind == "trak"]
    if len(traks) != 1:
        raise ValueError(f"{path}: expected one track, found {len(traks)}")
    trak = {kind: (begin, end) for kind, begin, end in box_children(data, *traks[0])}
    mdia = {kind: (begin, end) for kind, begin, end in box_children(data, *trak["mdia"])}
    edts = {kind: (begin, end) for kind, begin, end in box_children(data, *trak["edts"])}

    mvhd, tkhd, mdhd, elst = moov["mvhd"][0], trak["tkhd"][0], mdia["mdhd"][0], edts["elst"][0]
    if any(data[box] != 0 for box in (mvhd, tkhd, mdhd, elst)):
        raise ValueError(f"{path}: expected version 0 boxes")
    if struct.unpack(">I", data[elst + 4:elst + 8])[0] != 1:
        raise ValueError(f"{path}: expected a single edit")
    movie_timescale = struct.unpack(">I", data[mvhd + 12:mvhd + 16])[0]
    media_timescale, media_duration = struct.unpack(">II", data[mdhd + 12:mdhd + 20])
    duration = round(Fraction(media_duration, media_timescale) * movie_timescale)
    struct.pack_into(">I", data, mvhd + 16, duration)
    struct.pack_into(">I", data, tkhd + 20, duration)
    struct.pack_into(">I", data, elst + 8, duration)
    with open(path, "wb") as handle:
        handle.write(data)


def retime(clip: tuple[str, str, str, int | None, int], out_dir: str, work_dir: str) -> dict:
    output_name, revision, source_path, keep_frames, crf = clip
    source = os.path.join(work_dir, os.path.basename(source_path))
    with open(source, "wb") as handle:
        subprocess.run(["git", "show", f"{revision}:{source_path}"], check=True, stdout=handle)

    source_fps, source_frames = probe(source)
    frames = min(keep_frames or source_frames, source_frames)
    # The last kept frame stays on screen for one source frame time, slowed down like the rest
    duration = frames / source_fps / TEMPO
    target_frames = round(duration * OUT_FPS)

    filters = ",".join([
        f"trim=end_frame={frames}",
        # minterpolate stops at the last source timestamp, and a tpad after it would restart the clones at the end of
        # the stream, leaving a gap: give it the last frame twice more instead
        "tpad=stop_mode=clone:stop=2",
        f"setpts=(PTS-STARTPTS)/{float(TEMPO)}",
        INTERPOLATE,
        "format=yuv420p",
    ])
    output = os.path.join(out_dir, output_name)
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", source, "-an", "-vf", filters, "-frames:v", str(target_frames),
         "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-profile:v", "high", "-pix_fmt", "yuv420p",
         "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
         "-movflags", "+faststart", "-map_metadata", "-1", output],
        check=True,
    )
    check_grid(output, target_frames)
    trim_edit_list(output)

    out_fps, out_frames = probe(output)
    return {
        "file": output_name,
        "source": f"{revision}:{source_path}",
        "source_fps": float(source_fps),
        "source_frames": frames,
        "crf": crf,
        "target_seconds": round(float(duration), 4),
        "fps": float(out_fps),
        "frames": out_frames,
        "seconds": round(out_frames / float(out_fps), 4),
        "bytes": os.path.getsize(output),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", default=OUT_DIR, help=f"output directory (default {OUT_DIR})")
    parser.add_argument("--jobs", type=int, default=4, help="clips encoded in parallel (default 4)")
    args = parser.parse_args()
    os.makedirs(args.out, exist_ok=True)

    with tempfile.TemporaryDirectory() as work_dir, ThreadPoolExecutor(args.jobs) as pool:
        results = list(pool.map(lambda clip: retime(clip, args.out, work_dir), CLIPS))

    for result in results:
        print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
