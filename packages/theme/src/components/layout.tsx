import { type ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useTheme } from '../provider';
import { DesktopBreakpoint, PhoneColumnWidth } from '../tokens';

const isWeb = Platform.OS === 'web';

/** Web at desktop width; always false on native. */
export function useDesktopLayout(): boolean {
  const { width } = useWindowDimensions();
  return isWeb && width >= DesktopBreakpoint;
}

type PhoneColumnProps = {
  /** False hands over the full width; the tree stays the same, so nothing below remounts. */
  enabled?: boolean;
  children: ReactNode;
};

/** Web: holds the app to a centred phone-width column on a wide screen. Native: passes through. */
export function PhoneColumn({ enabled = true, children }: PhoneColumnProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  if (!isWeb) return <>{children}</>;

  const framed = enabled && width > PhoneColumnWidth;
  return (
    <View style={[styles.backdrop, { backgroundColor: framed ? theme.backdrop : theme.bg }]}>
      <View style={[styles.column, { backgroundColor: theme.bg }, framed && [styles.framed, { borderColor: theme.border }]]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
  },
  framed: {
    maxWidth: PhoneColumnWidth,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
});
