import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  addDays,
  daysBetween,
  formatDateKey,
  parseDateKey,
  shortDateLabel,
  shortMonthLabel,
  weekdayLabel,
} from '@/lib/dates';
import { weightAxis } from '@coachos/theme';

export type WeightChartEntry = {
  /** YYYY-MM-DD, a calendar date. */
  date: string;
  weightKg: number;
};

type WeightChartProps = {
  entries: WeightChartEntry[];
  /** The range on screen. Each point sits at its real date inside it, so a week with nothing logged is a visible gap. */
  from: string;
  to: string;
};

const CHART_HEIGHT = 208;
/** Left leaves room for the kg labels, bottom for the date labels, top for the unit. */
const MARGIN = { top: 22, right: 14, bottom: 26, left: 38 };
/** Date labels narrower than this apart are thinned out; their gridlines stay. */
const MIN_LABEL_SPACING = 30;
const AXIS_FONT_SIZE = 10;

type DateTick = { date: string; label: string };

/** Days across a week, weeks across a month, months across anything longer. */
function dateTicks(from: string, to: string): DateTick[] {
  const span = daysBetween(from, to);
  const ticks: DateTick[] = [];

  if (span <= 13) {
    for (let offset = 0; offset <= span; offset += 1) {
      const date = addDays(from, offset);
      ticks.push({ date, label: span <= 7 ? weekdayLabel(date) : shortDateLabel(date) });
    }
  } else if (span <= 62) {
    for (let offset = 0; offset <= span; offset += 7) {
      const date = addDays(from, offset);
      ticks.push({ date, label: shortDateLabel(date) });
    }
  } else {
    const start = parseDateKey(from);
    // The first 1st of a month on or after `from`.
    const month = new Date(start.getFullYear(), start.getMonth() + (start.getDate() === 1 ? 0 : 1), 1);
    while (daysBetween(from, formatDateKey(month)) <= span) {
      const date = formatDateKey(month);
      // January carries the year, so a year-long axis says where it turns over.
      ticks.push({ date, label: month.getMonth() === 0 ? String(month.getFullYear()) : shortMonthLabel(date) });
      month.setMonth(month.getMonth() + 1);
    }
  }
  return ticks;
}

/**
 * Entries further apart than this many days are joined by a faint dashed line
 * instead of a solid one: nothing was logged in between, so it isn't a measured
 * trend. A day for a week or a month; proportionally longer for wider ranges,
 * where a daily gap is smaller than a dot.
 */
function gapDays(span: number): number {
  return Math.max(1, Math.round(span / 30));
}

/** Weight over real time: a point per entry at its date, kg on a labelled axis. */
export function WeightChart({ entries, from, to }: WeightChartProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const span = Math.max(1, daysBetween(from, to));
  const inRange = entries
    .filter((entry) => {
      const offset = daysBetween(from, entry.date);
      return offset >= 0 && offset <= span;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  if (inRange.length === 0) {
    return (
      <View style={[styles.frame, styles.empty]}>
        <ThemedText type="small" themeColor="textSecondary">
          No weight logged in this range yet.
        </ThemedText>
      </View>
    );
  }

  const axis = weightAxis(inRange.map((entry) => entry.weightKg));
  const plotWidth = Math.max(1, width - MARGIN.left - MARGIN.right);
  const plotHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  const xOf = (date: string) => MARGIN.left + (daysBetween(from, date) / span) * plotWidth;
  const yOf = (kg: number) => MARGIN.top + (1 - (kg - axis.min) / (axis.max - axis.min || 1)) * plotHeight;

  const ticks = dateTicks(from, to);
  const labelEvery = Math.max(1, Math.ceil(MIN_LABEL_SPACING / (plotWidth / Math.max(ticks.length, 1))));
  // When labels are thinned, keep the one that names the year in the set that shows.
  const yearTick = ticks.findIndex((tick) => /^\d{4}$/.test(tick.label));
  const labelOffset = yearTick >= 0 ? yearTick % labelEvery : 0;

  // Solid runs of closely spaced entries, and dashed connectors across the gaps between them.
  const threshold = gapDays(span);
  const runs: WeightChartEntry[][] = [];
  const gaps: [WeightChartEntry, WeightChartEntry][] = [];
  for (const entry of inRange) {
    const run = runs[runs.length - 1];
    const previous = run?.[run.length - 1];
    if (run && previous && daysBetween(previous.date, entry.date) <= threshold) {
      run.push(entry);
    } else {
      if (previous) gaps.push([previous, entry]);
      runs.push([entry]);
    }
  }

  const latest = inRange[inRange.length - 1];
  const summary = `Weight chart from ${shortDateLabel(from)} to ${shortDateLabel(to)}: ${inRange.length} ${
    inRange.length === 1 ? 'entry' : 'entries'
  }${latest ? `, latest ${latest.weightKg} kg on ${shortDateLabel(latest.date)}` : ''}.`;
  const dotRadius = span > 62 ? 2.5 : 4;

  return (
    <View
      style={styles.frame}
      accessible
      accessibilityRole="image"
      accessibilityLabel={summary}
      onLayout={(event) => setWidth(Math.round(event.nativeEvent.layout.width))}>
      {width > 0 ? (
        <Svg width={width} height={CHART_HEIGHT}>
          <SvgText
            x={MARGIN.left - 8}
            y={MARGIN.top - 10}
            fontSize={AXIS_FONT_SIZE}
            fontFamily={Fonts.sansSemibold}
            fill={theme.chartAxis}
            textAnchor="end">
            kg
          </SvgText>

          {axis.ticks.map((kg) => {
            const y = yOf(kg);
            return (
              <G key={`kg-${kg}`}>
                <Line
                  x1={MARGIN.left}
                  y1={y}
                  x2={MARGIN.left + plotWidth}
                  y2={y}
                  stroke={kg === axis.min ? theme.border : theme.chartGrid}
                  strokeWidth={1}
                />
                <SvgText
                  x={MARGIN.left - 8}
                  y={y + AXIS_FONT_SIZE / 3}
                  fontSize={AXIS_FONT_SIZE}
                  fontFamily={Fonts.sansMedium}
                  fill={theme.chartAxis}
                  textAnchor="end">
                  {Number.isInteger(kg) ? String(kg) : kg.toFixed(1)}
                </SvgText>
              </G>
            );
          })}

          {ticks.map((tick, index) => {
            const x = xOf(tick.date);
            return (
              <G key={`date-${tick.date}`}>
                <Line
                  x1={x}
                  y1={MARGIN.top + plotHeight}
                  x2={x}
                  y2={MARGIN.top + plotHeight + 4}
                  stroke={theme.border}
                  strokeWidth={1}
                />
                {index % labelEvery === labelOffset ? (
                  <SvgText
                    x={x}
                    y={CHART_HEIGHT - 8}
                    fontSize={AXIS_FONT_SIZE}
                    fontFamily={Fonts.sansMedium}
                    fill={theme.chartAxis}
                    textAnchor="middle">
                    {tick.label}
                  </SvgText>
                ) : null}
              </G>
            );
          })}

          {gaps.map(([start, end]) => (
            <Line
              key={`gap-${start.date}-${end.date}`}
              x1={xOf(start.date)}
              y1={yOf(start.weightKg)}
              x2={xOf(end.date)}
              y2={yOf(end.weightKg)}
              stroke={theme.chartAxis}
              strokeOpacity={0.5}
              strokeWidth={1.5}
              strokeDasharray="3 4"
            />
          ))}

          {runs
            .filter((run) => run.length > 1)
            .map((run) => (
              <Polyline
                key={`run-${run[0]?.date}`}
                points={run.map((entry) => `${xOf(entry.date)},${yOf(entry.weightKg)}`).join(' ')}
                fill="none"
                stroke={theme.chartBar}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}

          {inRange.map((entry) => (
            <Circle
              key={`point-${entry.date}`}
              cx={xOf(entry.date)}
              cy={yOf(entry.weightKg)}
              r={dotRadius}
              fill={theme.chartBar}
              stroke={theme.surface}
              strokeWidth={1.5}
            />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    height: CHART_HEIGHT,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
