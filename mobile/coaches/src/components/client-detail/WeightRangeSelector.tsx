import { SegmentedControl } from '@coachos/theme';

import { WEIGHT_RANGES, type WeightRangeKey } from '@/lib/weight-range';

type WeightRangeSelectorProps = {
  value: WeightRangeKey;
  onChange: (range: WeightRangeKey) => void;
};

const OPTIONS = WEIGHT_RANGES.map((range) => ({ value: range.key, label: range.label }));

/** 1 week / 1 month / 3 months / 1 year, above the weight chart. */
export function WeightRangeSelector({ value, onChange }: WeightRangeSelectorProps) {
  return <SegmentedControl options={OPTIONS} value={value} onChange={onChange} accessibilityLabel="Weight range" />;
}
