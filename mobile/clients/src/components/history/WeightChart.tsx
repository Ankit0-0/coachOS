import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Polyline, Stop, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type WeightPoint = {
  day: string;
  value: number;
};

type WeightChartProps = {
  data: WeightPoint[];
};

export function WeightChart({ data }: WeightChartProps) {
  const theme = useTheme();

  if (data.length === 0) {
    return (
      <View style={styles.wrapper}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
          No weight logged for this period yet.
        </ThemedText>
      </View>
    );
  }

  const values = data.map((item) => item.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const chartWidth = 320;
  const chartHeight = 200;
  const paddingX = 16;
  const paddingY = 18;

  const points = data.map((point, index) => {
    const x =
      data.length === 1
        ? chartWidth / 2
        : paddingX + (index / (data.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - ((point.value - min) / range) * (chartHeight - paddingY * 2);
    return { x, y, label: point.day };
  });

  const linePoints = points.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPoints = `${linePoints} ${points[points.length - 1].x},${chartHeight - paddingY} ${points[0].x},${chartHeight - paddingY}`;

  return (
    <View style={styles.wrapper}>
      <Svg width={chartWidth} height={chartHeight + 24} viewBox={`0 0 ${chartWidth} ${chartHeight + 24}`}>
        <Defs>
          <LinearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.chartWorkout} stopOpacity={0.28} />
            <Stop offset="1" stopColor={theme.chartWorkout} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>

        {[0, 1, 2, 3].map((step) => {
          const y = paddingY + (step / 3) * (chartHeight - paddingY * 2);
          return <Line key={step} x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke={theme.chartGrid} strokeWidth={1} />;
        })}

        <Polyline points={areaPoints} fill="url(#weightFill)" stroke="none" />
        <Polyline points={linePoints} fill="none" stroke={theme.chartWorkout} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />

        {points.map((point) => (
          <Circle key={point.label} cx={point.x} cy={point.y} r={4} fill={theme.chartWorkout} stroke={theme.surface} strokeWidth={2} />
        ))}

        {points.map((point) => (
          <SvgText key={`${point.label}-label`} x={point.x} y={chartHeight + 12} fontSize={10} fontFamily={Fonts.sansMedium} fill={theme.chartAxis} textAnchor="middle">
            {point.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    paddingVertical: 24,
  },
});
