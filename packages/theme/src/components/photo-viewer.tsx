import { SymbolView } from 'expo-symbols';
import { StatusBar } from 'expo-status-bar';
import { memo, useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ImageLoadEventData,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../provider';
import { HitTarget, Radii, ScreenPadding, Spacing } from '../tokens';
import { ThemedText } from './text';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const CLOSE_ICON: SymbolName = { ios: 'xmark', android: 'close', web: 'close' };
const PREVIOUS_ICON: SymbolName = { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' };
const NEXT_ICON: SymbolName = { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' };

export type ViewerPhoto = {
  /** Unique within the set. */
  id: string;
  url: string;
  /** Caption, first line: the weight, or the meal. */
  title: string;
  /** Caption, second line: usually the date. */
  subtitle: string;
  accessibilityLabel: string;
};

type Size = { width: number; height: number };

/** Above the photo: the counter and the close button. */
const TOP_BAR = HitTarget + Spacing.two * 2;
/** Below it: the two-line caption. */
const CAPTION_BAR = 40 + Spacing.three * 2;
const MAX_ZOOM = 4;
/** Web: prev/next buttons from this width; narrower screens swipe, and the buttons would cover the photo. */
const ARROWS_MIN_WIDTH = 600;
/** Each side, with the buttons showing: their inset, their width and a gap. */
const ARROW_GUTTER = Spacing.three + HitTarget + Spacing.two;

let pendingContent: { photos: ViewerPhoto[]; index: number } | null = null;

/** Hands a set to the viewer route; a list of signed URLs is too long for route params. */
export function setPhotoViewerContent(content: { photos: ViewerPhoto[]; index: number }) {
  pendingContent = content;
}

/** What the viewer route should show; null after a reload on web, when there is nothing to show. */
export function photoViewerContent() {
  return pendingContent;
}

function clampIndex(index: number, count: number): number {
  return Math.min(Math.max(index, 0), Math.max(count - 1, 0));
}

/** The largest size with the photo's proportions that fits the box. Never crops. */
function fitWithin(natural: Size, box: Size): Size {
  const scale = Math.min(box.width / natural.width, box.height / natural.height);
  return { width: Math.floor(natural.width * scale), height: Math.floor(natural.height * scale) };
}

/** Native reports the decoded size; web passes the DOM load event, whose target is the image. */
function naturalSizeOf(event: NativeSyntheticEvent<ImageLoadEventData>): Size | null {
  const { source } = event.nativeEvent;
  if (source?.width && source?.height) return { width: source.width, height: source.height };
  const target = (event.nativeEvent as unknown as { target?: { naturalWidth?: number; naturalHeight?: number } })
    .target;
  if (target?.naturalWidth && target.naturalHeight) {
    return { width: target.naturalWidth, height: target.naturalHeight };
  }
  return null;
}

type PhotoPageProps = {
  photo: ViewerPhoto;
  width: number;
  height: number;
  /** Space kept clear around the photo for the controls and caption. */
  top: number;
  bottom: number;
  side: number;
  onClose: () => void;
};

/** Memoised: a page re-rendering hands web's Image a new onLoad, which reloads the photo. */
const PhotoPage = memo(function PhotoPage({ photo, width, height, top, bottom, side, onClose }: PhotoPageProps) {
  const theme = useTheme();
  const [natural, setNatural] = useState<Size | null>(null);
  const [failed, setFailed] = useState(false);

  const area = { width: Math.max(0, width - side * 2), height: Math.max(0, height - top - bottom) };
  const fitted = natural ? fitWithin(natural, area) : null;

  // An unchanged size must not re-render, or web's Image loads again and loops.
  const handleLoad = useCallback(
    (event: NativeSyntheticEvent<ImageLoadEventData>) => {
      const next = naturalSizeOf(event) ?? { width: area.width, height: area.height };
      setNatural((current) =>
        current && current.width === next.width && current.height === next.height ? current : next,
      );
    },
    [area.width, area.height],
  );
  const handleError = useCallback(() => setFailed(true), []);

  // Full-size and invisible until its proportions are known, then exactly the
  // photo's shape, so a tap beside it lands on the backdrop rather than on it.
  const image = failed ? null : (
    <Image
      source={{ uri: photo.url }}
      accessibilityLabel={photo.accessibilityLabel}
      resizeMode="contain"
      onLoad={handleLoad}
      onError={handleError}
      style={fitted ?? [area, styles.measuring]}
    />
  );

  return (
    <View style={{ width, height }}>
      <Pressable accessible={false} onPress={onClose} style={StyleSheet.absoluteFill} />
      <View style={[styles.area, { top, left: side, width: area.width, height: area.height }]}>
        {Platform.OS === 'ios' ? (
          // Pinch to zoom comes free with a native scroll view on iOS.
          <ScrollView
            style={StyleSheet.absoluteFill}
            contentContainerStyle={[area, styles.centered]}
            maximumZoomScale={MAX_ZOOM}
            minimumZoomScale={1}
            centerContent
            alwaysBounceVertical={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}>
            <Pressable accessible={false} onPress={onClose} style={StyleSheet.absoluteFill} />
            {image}
          </ScrollView>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.centered, styles.passThrough]}>{image}</View>
        )}

        {!natural && !failed ? (
          <View style={[StyleSheet.absoluteFill, styles.centered, styles.passThrough]}>
            <ActivityIndicator color={theme.onViewer} accessibilityLabel="Loading photo" />
          </View>
        ) : null}
        {failed ? (
          <View style={[StyleSheet.absoluteFill, styles.centered, styles.passThrough]}>
            <ThemedText type="small" themeColor="onViewerMuted" style={styles.centerText}>
              This photo didn’t load. Close it and open it again.
            </ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
});

type PhotoViewerProps = {
  photos: ViewerPhoto[];
  initialIndex: number;
  /** For the X, the backdrop, and Escape on web. Android's back button pops the route itself. */
  onClose: () => void;
};

/**
 * Full-screen photos on a dark backdrop, fitted and never cropped, with a
 * swipe between the photos in the set.
 */
export function PhotoViewer({ photos, initialIndex, onClose }: PhotoViewerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const windowSize = useWindowDimensions();
  // The viewer's own box rather than the window: on the web it can sit in the app's column.
  const [size, setSize] = useState<Size>({ width: windowSize.width, height: windowSize.height });
  const startIndex = clampIndex(initialIndex, photos.length);
  const [index, setIndex] = useState(startIndex);
  const indexRef = useRef(startIndex);
  const listRef = useRef<FlatList<ViewerPhoto>>(null);

  const step = useCallback(
    (delta: number) => {
      const target = indexRef.current + delta;
      if (target < 0 || target >= photos.length) return;
      listRef.current?.scrollToIndex({ index: target, animated: true });
    },
    [photos.length],
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowLeft') step(-1);
      else if (event.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, step]);

  // Same photo in view after a rotation or a resized window.
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: indexRef.current * size.width, animated: false });
  }, [size.width]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (size.width === 0) return;
    const next = clampIndex(Math.round(event.nativeEvent.contentOffset.x / size.width), photos.length);
    if (next !== indexRef.current) {
      indexRef.current = next;
      setIndex(next);
    }
  };

  const current = photos[index];
  if (!current) return null;

  const top = insets.top + TOP_BAR;
  const bottom = insets.bottom + CAPTION_BAR;
  const showArrows = Platform.OS === 'web' && photos.length > 1 && size.width >= ARROWS_MIN_WIDTH;
  const side = showArrows ? ARROW_GUTTER : ScreenPadding;

  return (
    <View
      accessibilityViewIsModal
      onLayout={handleLayout}
      style={[styles.root, { backgroundColor: theme.viewerBackdrop }]}>
      <StatusBar style="light" />

      <FlatList
        ref={listRef}
        data={photos}
        keyExtractor={(photo) => photo.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={startIndex}
        getItemLayout={(_, itemIndex) => ({ length: size.width, offset: size.width * itemIndex, index: itemIndex })}
        initialNumToRender={1}
        windowSize={3}
        extraData={size}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <PhotoPage
            photo={item}
            width={size.width}
            height={size.height}
            top={top}
            bottom={bottom}
            side={side}
            onClose={onClose}
          />
        )}
      />

      <View style={[styles.topBar, styles.passThrough, { paddingTop: insets.top + Spacing.two }]}>
        <ThemedText type="smallBold" themeColor="onViewer">
          {photos.length > 1 ? `${index + 1} of ${photos.length}` : ''}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={({ pressed }) => [styles.control, { backgroundColor: theme.viewerControl }, pressed && styles.pressed]}>
          <SymbolView name={CLOSE_ICON} size={18} tintColor={theme.onViewer} />
        </Pressable>
      </View>

      {showArrows && index > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous photo"
          onPress={() => step(-1)}
          style={({ pressed }) => [
            styles.control,
            styles.arrow,
            styles.previous,
            { backgroundColor: theme.viewerControl },
            pressed && styles.pressed,
          ]}>
          <SymbolView name={PREVIOUS_ICON} size={20} tintColor={theme.onViewer} />
        </Pressable>
      ) : null}
      {showArrows && index < photos.length - 1 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next photo"
          onPress={() => step(1)}
          style={({ pressed }) => [
            styles.control,
            styles.arrow,
            styles.next,
            { backgroundColor: theme.viewerControl },
            pressed && styles.pressed,
          ]}>
          <SymbolView name={NEXT_ICON} size={20} tintColor={theme.onViewer} />
        </Pressable>
      ) : null}

      <View style={[styles.caption, styles.passThrough, { paddingBottom: insets.bottom + Spacing.three }]}>
        <ThemedText type="smallBold" themeColor="onViewer" numberOfLines={1} style={styles.centerText}>
          {current.title}
        </ThemedText>
        <ThemedText type="meta" themeColor="onViewerMuted" style={styles.centerText}>
          {current.subtitle}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  area: {
    position: 'absolute',
    pointerEvents: 'box-none',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  passThrough: {
    pointerEvents: 'box-none',
  },
  measuring: {
    opacity: 0,
  },
  centerText: {
    textAlign: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ScreenPadding,
    paddingBottom: Spacing.two,
  },
  control: {
    width: HitTarget,
    height: HitTarget,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -HitTarget / 2,
  },
  previous: {
    left: Spacing.three,
  },
  next: {
    right: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    gap: Spacing.half,
    paddingTop: Spacing.three,
    paddingHorizontal: ScreenPadding,
  },
});
