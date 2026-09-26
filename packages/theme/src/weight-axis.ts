/**
 * Where the weight axis starts.
 *
 * - 'zero'   The axis runs up from 0 kg. Heights are honest proportions of body
 *            weight, but a 1–2 kg change — real progress — is close to a flat line.
 * - 'padded' The axis hugs the data's own lowest and highest values with some
 *            headroom, so small changes read clearly; the labels keep the scale plain.
 */
export const WEIGHT_AXIS_BASELINE: 'zero' | 'padded' = 'padded';

const TARGET_WEIGHT_TICKS = 4;
/** Headroom when the data has no spread (one entry, or all equal); ±1 kg is too tight to read. */
const FLAT_SERIES_HEADROOM_KG = 5;

/** 1, 2, 2.5 or 5 times a power of ten: steps that make readable axis labels. */
function niceStep(rough: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / magnitude;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * magnitude;
}

/** The kg axis for a weight chart; shared by both apps' WeightChart. */
export function weightAxis(values: number[]): { min: number; max: number; ticks: number[] } {
  const lowest = Math.min(...values);
  const highest = Math.max(...values);
  const range = highest - lowest;
  const headroom = range === 0 ? FLAT_SERIES_HEADROOM_KG : Math.max(1, range * 0.25);
  const low = WEIGHT_AXIS_BASELINE === 'zero' ? 0 : lowest - headroom;
  const high = WEIGHT_AXIS_BASELINE === 'zero' ? highest : highest + headroom;

  const step = niceStep(Math.max(high - low, 1) / TARGET_WEIGHT_TICKS);
  const min = Math.max(0, Math.floor(low / step) * step);
  const max = Math.ceil(high / step) * step;
  const ticks: number[] = [];
  // Rounded as it goes, so 2.5 kg steps don't accumulate float error.
  for (let value = min; value <= max + step / 1000; value += step) ticks.push(Math.round(value * 100) / 100);
  return { min, max, ticks };
}
