import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Polyline, Stop, Text } from 'react-native-svg';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { weightHistory } from '@/data/mock-data';

export default function HistoryScreen() {
  const theme = useTheme();

  const values = weightHistory.map((item) => item.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const chartWidth = 320;
  const chartHeight = 200;
  const paddingX = 16;
  const paddingY = 18;

  const points = weightHistory.map((point, index) => {
    const x = paddingX + (index / (weightHistory.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - ((point.value - min) / range) * (chartHeight - paddingY * 2);
    return { x, y, value: point.value, label: point.day };
  });

  const linePoints = points.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPoints = `${linePoints} ${points[points.length - 1].x},${chartHeight - paddingY} ${points[0].x},${chartHeight - paddingY}`;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;

  return (
    <ScreenScaffold>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="accent">
          History
        </ThemedText>
        <ThemedText type="subtitle" style={styles.title}>
          Weight trend
        </ThemedText>
      </View>

      <ThemedView type="backgroundElement" style={[styles.chartCard, { borderColor: theme.border }]}>
        <View style={styles.chartHeader}>
          <ThemedText type="smallBold">Weekly weight</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {average.toFixed(1)} kg avg
          </ThemedText>
        </View>

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

          {points.map((point) => (
            <Circle key={point.label} cx={point.x} cy={point.y} r={4} fill="#3A7BFF" stroke="#FFFFFF" strokeWidth={2} />
          ))}

          {points.map((point) => (
            <Text
              key={`${point.label}-label`}
              x={point.x}
              y={chartHeight + 12}
              fontSize={10}
              fill="#64748B"
              textAnchor="middle"
            >
              {point.label}
            </Text>
          ))}
        </Svg>
      </ThemedView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
  },
  chartCard: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
