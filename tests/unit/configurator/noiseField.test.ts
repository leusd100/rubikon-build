import { describe, expect, it } from 'vitest';
import { buildNoiseField, mulberry32, normalByteFromGradient, roughnessNoiseByte } from '../../../app/components/configurator/three/noiseField';

describe('mulberry32', () => {
  it('is deterministic — the same seed produces the exact same sequence', () => {
    const a = mulberry32(1337);
    const b = mulberry32(1337);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds produce different sequences', () => {
    const a = mulberry32(1337);
    const b = mulberry32(4242);
    expect(a()).not.toBe(b());
  });

  it('every value is in [0, 1)', () => {
    const rand = mulberry32(7);
    for (let i = 0; i < 200; i += 1) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('does not repeat the same value on every call (not a degenerate constant generator)', () => {
    const rand = mulberry32(99);
    const values = new Set(Array.from({ length: 20 }, () => rand()));
    expect(values.size).toBeGreaterThan(1);
  });
});

describe('buildNoiseField', () => {
  it('returns exactly size*size values', () => {
    const field = buildNoiseField(8, 1);
    expect(field.length).toBe(64);
  });

  it('is deterministic — same size and seed produce an identical field', () => {
    const a = buildNoiseField(16, 1337);
    const b = buildNoiseField(16, 1337);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('different seeds produce different fields (same size)', () => {
    const a = buildNoiseField(16, 1337);
    const b = buildNoiseField(16, 4242);
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });

  it('normalises to [0, 1], reaching both ends of the range', () => {
    const field = buildNoiseField(32, 1337);
    let min = Infinity;
    let max = -Infinity;
    for (const v of field) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      if (v < min) min = v;
      if (v > max) max = v;
    }
    // A real (non-constant) noise field should touch both ends of its own normalised range.
    expect(min).toBeCloseTo(0, 6);
    expect(max).toBeCloseTo(1, 6);
  });

  it('is not flat/uniform static — neighbouring cells are usually close in value (the whole point of blending octaves bilinearly, vs. independent per-pixel noise)', () => {
    const size = 32;
    const field = buildNoiseField(size, 1337);
    let totalJump = 0;
    let samples = 0;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size - 1; x += 1) {
        totalJump += Math.abs(field[y * size + x] - field[y * size + x + 1]);
        samples += 1;
      }
    }
    // A degenerate implementation (independent random value per pixel, no bilinear blending)
    // would average roughly a 1/3 jump between neighbours for a uniform-[0,1] field; this field's
    // actual construction should read far smoother than that.
    expect(totalJump / samples).toBeLessThan(0.15);
  });
});

describe('roughnessNoiseByte', () => {
  it('maps 0 -> 160 and 1 -> 230 (the documented ±20% swing around a mid-grey base)', () => {
    expect(roughnessNoiseByte(0)).toBe(160);
    expect(roughnessNoiseByte(1)).toBe(230);
  });

  it('is monotonically non-decreasing across the input range', () => {
    let previous = -Infinity;
    for (let v = 0; v <= 1; v += 0.05) {
      const byte = roughnessNoiseByte(v);
      expect(byte).toBeGreaterThanOrEqual(previous);
      previous = byte;
    }
  });

  it('never leaves the valid byte range [0, 255] across the documented [0,1] input domain', () => {
    for (let v = 0; v <= 1; v += 0.1) {
      const byte = roughnessNoiseByte(v);
      expect(byte).toBeGreaterThanOrEqual(0);
      expect(byte).toBeLessThanOrEqual(255);
    }
  });
});

describe('normalByteFromGradient', () => {
  it('a flat gradient (dx=0, dy=0) points straight up: (128, 128, 255) — the neutral tangent-space normal', () => {
    expect(normalByteFromGradient(0, 0)).toEqual({ r: 128, g: 128, b: 255 });
  });

  it('every channel stays a valid byte across a range of gradients, including steep ones', () => {
    for (const dx of [-2, -0.5, 0, 0.5, 2]) {
      for (const dy of [-2, -0.5, 0, 0.5, 2]) {
        const { r, g, b } = normalByteFromGradient(dx, dy);
        for (const channel of [r, g, b]) {
          expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(255);
        }
      }
    }
  });

  it('flipping the sign of dx flips the red channel around the neutral 128 midpoint (X perturbation lives in R)', () => {
    const positive = normalByteFromGradient(1, 0);
    const negative = normalByteFromGradient(-1, 0);
    // Within 1 byte of exact mirror symmetry — Math.round's own half-up asymmetry on two
    // floating-point-mirrored inputs can land the two sides one byte apart, not a real defect.
    expect(Math.abs((positive.r - 128) + (negative.r - 128))).toBeLessThanOrEqual(1);
    expect(positive.r).toBeLessThan(128);
    expect(negative.r).toBeGreaterThan(128);
    // Y is untouched by a pure-X gradient.
    expect(positive.g).toBe(128);
    expect(negative.g).toBe(128);
  });

  it('flipping the sign of dy flips the green channel around the neutral 128 midpoint (Y perturbation lives in G)', () => {
    const positive = normalByteFromGradient(0, 1);
    const negative = normalByteFromGradient(0, -1);
    expect(Math.abs((positive.g - 128) + (negative.g - 128))).toBeLessThanOrEqual(1);
    expect(positive.g).toBeLessThan(128);
    expect(negative.g).toBeGreaterThan(128);
    expect(positive.r).toBe(128);
    expect(negative.r).toBe(128);
  });

  it('a steeper gradient pulls the blue channel down from 255 (the surface tilts away from "straight up")', () => {
    const flat = normalByteFromGradient(0, 0);
    const steep = normalByteFromGradient(3, 3);
    expect(steep.b).toBeLessThan(flat.b);
  });
});
