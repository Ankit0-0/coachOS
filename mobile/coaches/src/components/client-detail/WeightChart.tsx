import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Polyline, Stop, Text as SvgText } from 'react-native-svg';

export type WeightPoint = {
  day: string;
  value: number;
};

type WeightChartProps = {
  data: WeightPoint[];
};

/** Read-only line chart of a client's recent weight entries. */
export function WeightChart({ data }: WeightChartProps) {
  if (data.length === 0) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.emptyText}>No weight logged for this period yet.</Text>
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

  const first = points[0];
  const last = points[points.length - 1];
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPoints =
    first && last
      ? `${linePoints} ${last.x},${chartHeight - paddingY} ${first.x},${chartHeight - paddingY}`
      : linePoints;

  return (
    <View style={styles.wrapper}>
      <Svg width={chartWidth} height={chartHeight + 24} viewBox={`0 0 ${chartWidth} ${chartHeight + 24}`}>
        <Defs>
          <LinearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#3A7BFF" stopOpacity={0.28} />
            <Stop offset="1" stopColor="#3A7BFF" stopOpacity={0.02} />
          </LinearGradient>
        </Defs>

        {[0, 1, 2, 3].map((step) => {
          const y = paddingY + (step / 3) * (chartHeight - paddingY * 2);
          return <Line key={step} x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="#DDE7FF" strokeWidth={1} />;
        })}

        <Polyline points={areaPoints} fill="url(#weightFill)" stroke="none" />
        <Polyline points={linePoints} fill="none" stroke="#3A7BFF" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />

        {points.map((point, index) => (
          <Circle key={`${point.label}-${index}`} cx={point.x} cy={point.y} r={4} fill="#3A7BFF" stroke="#FFFFFF" strokeWidth={2} />
        ))}

        {points.map((point, index) => (
          <SvgText
            key={`${point.label}-${index}-label`}
            x={point.x}
            y={chartHeight + 12}
            fontSize={10}
            fill="#64748B"
            textAnchor="middle">
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
    color: '#64748B',
    fontSize: 13,
    paddingVertical: 24,
  },
});
