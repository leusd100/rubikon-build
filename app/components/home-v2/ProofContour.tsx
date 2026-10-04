'use client';

import { useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import type { HomeProofCase } from '../../data/homeProof';
import { homeProofContour, type ContourLine } from '../../data/homeProofContour';
import { DrawingSheet } from '../DrawingSheet';

// HOME's proof, variant A «Калька» (owner, 04.10): ONE «Креслення» sheet with the real photo, and over its right part
// the same frame as a tracing — desaturated, darkened, on a fine grid — with the copper lines measured from eight
// photos of this hangar: the gable's outline, both gates and the cladding-strip boundaries. Solid — measured, dashed —
// approximate (app/data/homeProofContour.ts). The seam between the two is a real range input, so the keyboard and
// screen readers move it as they move any slider.
//
// The photo, the tracing and the lines share one coordinate system: the frame keeps the photo's own proportion at
// every width, the images fill it with object-fit: cover and the SVG with the matching «xMidYMid slice», so a line sits
// on its gate or corner whatever the width (and nothing is cropped away on a phone).
//
// Mouse and pen drag anywhere in the frame; a finger drags only the handle, so the page still scrolls and zooms under
// a thumb (the frame is touch-action: pan-y pinch-zoom), and the title block offers «Фото» / «Контур» instead. «Лінії на
// фото» lays the lines over the photo too, as proof that they land on it. No figures anywhere, not even in what the
// slider says: sizes, scale and the structural frame cannot be read from a photo, and the note says so.
//
// The controls work only once the page is hydrated; until then (and without JavaScript) they are disabled, so nothing
// offers a move the static sheet cannot make.

/** The seam's resting place: between the two gates, so each side shows one of them */
const DEFAULT_SPLIT = 64;
const PAGE_STEP = 10;

const { photo: contourPhoto, variants, lines, label } = homeProofContour;
const SRC_SET = variants.map(({ src, width }) => `${src} ${width}w`).join(', ');
// The frame's width: the shell less the sheet's margins (34 px on a phone, 46 px above), at most 1440 − 46
const SIZES = '(max-width: 760px) calc(100vw - 66px), (max-width: 1556px) calc(92.5vw - 46px), 1394px';

const pathOf = ({ points }: ContourLine) => `M${points.map(([x, y]) => `${x} ${y}`).join('L')}`;
const clamp = (value: number) => Math.min(100, Math.max(0, value));
// False in the server markup and the hydrating render, true after (ProjectInquiryForm's idiom)
const subscribeToHydration = () => () => undefined;

// What the slider says instead of a per cent: which side is which, and roughly how much of each shows
function valueText(value: number) {
  if (value >= 100) return 'Лише фото';
  if (value <= 0) return 'Лише контур за фото';
  let share = 'порівну';
  if (value >= 80) share = 'здебільшого фото';
  else if (value > 55) share = 'більше фото';
  else if (value <= 20) share = 'здебільшого контур';
  else if (value < 45) share = 'більше контуру';
  return `Фото ліворуч, контур праворуч: ${share}`;
}

function Lines({ casing }: Readonly<{ casing?: boolean }>) {
  return (
    <g className={casing ? 'hv2-contour-casing' : 'hv2-contour-ink'}>
      {lines.map((line, index) => (
        <path
          key={line.id}
          d={pathOf(line)}
          // Solid lines draw in by their dash offset, measured in path lengths; the dashed ones only fade in
          pathLength={line.approximate ? undefined : 1}
          data-line={line.id}
          data-kind={line.kind}
          data-approximate={line.approximate ? '' : undefined}
          style={{ '--i': index } as CSSProperties}
        >
          {!casing && <title>{line.title}</title>}
        </path>
      ))}
    </g>
  );
}

export function ProofContour({ photo }: Readonly<{ photo: HomeProofCase['photo'] }>) {
  const [split, setSplit] = useState(DEFAULT_SPLIT);
  const [linesOnPhoto, setLinesOnPhoto] = useState(false);
  const [dragging, setDragging] = useState(false);
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  // Focus the pointer put on the range: the keyboard's ring stays off until a key is pressed
  const [pointerFocus, setPointerFocus] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ pointer: number; offset: number } | null>(null);

  const splitAt = (clientX: number, offset = 0) => {
    const box = stageRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    // Tenths of a per cent: a whole per cent is a 13 px jump on a wide screen
    setSplit(Math.round(clamp(((clientX - offset - box.left) / box.width) * 100) * 10) / 10);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !ready) return;
    const handle = (event.target as Element).closest('.hv2-contour-handle');
    // A finger on the photo scrolls the page; only the handle takes it
    if (event.pointerType === 'touch' && !handle) return;
    event.preventDefault();
    if (handle) {
      // Grabbing the handle keeps the seam where it is and the handle under the pointer. The offset is taken from where
      // the handle is drawn, not from the seam: at either end of the frame it is held clear of the edge, off the seam
      const grip = handle.getBoundingClientRect();
      drag.current = { pointer: event.pointerId, offset: event.clientX - (grip.left + grip.width / 2) };
    } else {
      // A click elsewhere moves the seam there
      drag.current = { pointer: event.pointerId, offset: 0 };
      splitAt(event.clientX);
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    setPointerFocus(true);
    rangeRef.current?.focus({ preventScroll: true });
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer === event.pointerId) splitAt(event.clientX, drag.current.offset);
  };
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  // Arrows step by one through the native range; the larger steps are the same in every browser
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    setPointerFocus(false);
    const to = { PageUp: Math.round(split) + PAGE_STEP, PageDown: Math.round(split) - PAGE_STEP, Home: 0, End: 100 }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    setSplit(clamp(to));
  };

  // «Фото» / «Контур» show one side whole; pressed again, they bring the seam back between the gates
  const showOnly = (side: 100 | 0) => setSplit(split === side ? DEFAULT_SPLIT : side);

  return (
    <DrawingSheet
      className="hv2-contour"
      imageClassName="hv2-contour-media"
      cells={[
        { label: 'Ліворуч', value: 'Фото об’єкта' },
        {
          tone: 'note',
          label: 'Об’єкт',
          value: (
            <>
              <b>Реальний об’єкт і його контур.</b> Фото з ретушшю переднього плану; праворуч від лінії — фронтон, ворота
              й межі облицювання, накреслені за вісьмома фото цього ангара (суцільна — виміряно, пунктир — наближено),
              а розміри, масштаб і каркас із фото не прочитати.
            </>
          ),
        },
        {
          label: 'Праворуч',
          className: 'hv2-contour-right',
          value: (
            <>
              Контур за фото
              <span className="hv2-contour-legend">
                <span><svg viewBox="0 0 28 4" aria-hidden="true" focusable="false"><path d="M2 2H26" /></svg>виміряно</span>
                <span data-approximate=""><svg viewBox="0 0 28 4" aria-hidden="true" focusable="false"><path d="M2 2H26" /></svg>наближено</span>
              </span>
            </>
          ),
        },
      ]}
      action={
        <span className="hv2-contour-controls">
          <span className="hv2-contour-sides">
            <button type="button" aria-pressed={split === 100} disabled={!ready} onClick={() => showOnly(100)}>Фото</button>
            <button type="button" aria-pressed={split === 0} disabled={!ready} onClick={() => showOnly(0)}>Контур</button>
          </span>
          <button type="button" className="hv2-contour-toggle" aria-pressed={linesOnPhoto} disabled={!ready} onClick={() => setLinesOnPhoto((on) => !on)}>
            <i aria-hidden="true" />
            Лінії на фото
          </button>
        </span>
      }
    >
      <div
        ref={stageRef}
        className="hv2-contour-stage"
        style={{ '--split': `${split}%` } as CSSProperties}
        data-dragging={dragging ? '' : undefined}
        data-lines-on-photo={linesOnPhoto ? '' : undefined}
        data-pointer-focus={pointerFocus ? '' : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <picture>
          <source type="image/webp" srcSet={SRC_SET} sizes={SIZES} />
          <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" draggable={false} />
        </picture>
        {/* The tracing: the same frame (the same file, so no second download), grey and dark, on a fine grid */}
        <div className="hv2-contour-trace" aria-hidden="true">
          <picture>
            <source type="image/webp" srcSet={SRC_SET} sizes={SIZES} />
            <img src={photo.src} alt="" width={photo.width} height={photo.height} loading="lazy" decoding="async" draggable={false} />
          </picture>
        </div>
        <svg
          className="hv2-contour-lines"
          viewBox={`0 0 ${contourPhoto.width} ${contourPhoto.height}`}
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label={label}
        >
          {/* A thin dark casing under each copper line keeps it legible where it crosses the photo's light cladding */}
          <Lines casing />
          <Lines />
        </svg>
        <input
          ref={rangeRef}
          className="hv2-contour-range"
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(split)}
          aria-label="Порівняти фото й контур за фото"
          aria-valuetext={valueText(Math.round(split))}
          disabled={!ready}
          onChange={(event) => setSplit(Number(event.target.value))}
          onKeyDown={onKeyDown}
          onBlur={() => setPointerFocus(false)}
        />
        <span className="hv2-contour-seam" aria-hidden="true" />
        <span className="hv2-contour-handle" aria-hidden="true">‹ ›</span>
      </div>
    </DrawingSheet>
  );
}
