import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { SplashBackground } from '@/constants/theme';

const DURATION = 600;

/**
 * Takes over from the native splash and fades it out, so the hand-off into the
 * app is a fade rather than a cut. It draws the same colour and wordmark as the
 * native splash (app.json), which is what makes the swap invisible.
 */
export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: {
      opacity: 1,
    },
    20: {
      opacity: 1,
    },
    70: {
      opacity: 0,
      easing: Easing.elastic(0.7),
    },
    100: {
      opacity: 0,
      easing: Easing.elastic(0.7),
    },
  });

  const wordmark = <Image style={styles.wordmark} source={require('@/assets/images/splash-icon.png')} />;

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={[styles.splashOverlay, { backgroundColor: SplashBackground }]}>
      {wordmark}
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={[styles.splashOverlay, { backgroundColor: SplashBackground }]}>
      {wordmark}
    </View>
  );
}

const styles = StyleSheet.create({
  /** Same width the native splash uses (imageWidth: 200); the PNG is 1200x360. */
  wordmark: {
    width: 200,
    height: 60,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
