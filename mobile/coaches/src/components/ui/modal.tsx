import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import { type ReactNode } from 'react';
import {
  Modal as NativeModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useAppearance, useTheme } from '@/hooks/use-theme';

type ModalProps = {
  visible: boolean;
  /** Called for the backdrop, the close button and Android's back button alike. */
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/** The sheet never grows past this share of the screen; its content scrolls instead. */
const MAX_HEIGHT_RATIO = 0.8;

/**
 * A bottom sheet over a blurred page.
 *
 * The blur is iOS and web only. On Android, expo-blur doesn't blur unless it
 * is given an experimental blur method *and* a BlurTargetView wrapping the
 * content behind it — and a Modal renders in its own native window there, so
 * it can't target the page underneath at all. Android gets the theme's scrim
 * instead, which is also the cheap path on the devices where blur would stutter.
 */
export function Modal({ visible, onClose, title, children }: ModalProps) {
  const theme = useTheme();
  const { scheme } = useAppearance();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <NativeModal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={StyleSheet.absoluteFill}>
          {Platform.OS === 'android' ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }]} />
          ) : (
            <BlurView tint={scheme === 'dark' ? 'dark' : 'light'} intensity={40} style={StyleSheet.absoluteFill} />
          )}
        </Pressable>

        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              maxHeight: height * MAX_HEIGHT_RATIO,
              paddingBottom: Math.max(insets.bottom, Spacing.three),
            },
          ]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <ThemedText type="heading" style={styles.title} numberOfLines={1}>
              {title}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.close, { borderColor: theme.border }, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                size={16}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </NativeModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    flex: 1,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
});
