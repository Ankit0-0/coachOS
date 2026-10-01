import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { InsetPanel, Row } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Chip } from '@/components/ui/pill';
import { HitTarget, Radii, Spacing } from '@/constants/theme';
import { useDesktopLayout, useTheme } from '@/hooks/use-theme';
import { ApiError, type LibrarySearch } from '@/lib/api';
import { describeError } from '@/lib/api-errors';
import { groupResults, hasExactName } from '@/lib/library';
import { TextField } from '@coachos/theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const SEARCH_ICON: SymbolName = { ios: 'magnifyingglass', android: 'search', web: 'search' };
const CLEAR_ICON: SymbolName = { ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' };
const USE_ICON: SymbolName = { ios: 'pencil', android: 'edit', web: 'edit' };
const SAVED_ICON: SymbolName = { ios: 'checkmark', android: 'check', web: 'check' };

const SEARCH_DEBOUNCE_MS = 250;

export type LibraryEntry = { id: string; name: string; imageUrl: string | null; isGlobal: boolean };

/** What differs between the exercise and the diet-item picker. */
export type LibraryPickerConfig<T extends LibraryEntry, K extends string> = {
  title: string;
  searchPlaceholder: string;
  /** e.g. "Save to my exercises". */
  saveLabel: string;
  /** e.g. "Saved to your exercises". */
  savedLabel: string;
  /** Plural noun for empty states: "exercises". */
  noun: string;
  filterLabel: string;
  filters: { value: K; label: string }[];
  groupOf: (item: T) => K | null;
  /** Heading for entries with no group. */
  ungroupedLabel: string;
  search: (q: string, filter: K | null) => Promise<LibrarySearch<T>>;
  save: (name: string) => Promise<unknown>;
  /** Shown under the name, e.g. muscle chips. */
  details: (item: T) => ReactNode;
};

export type LibraryPickerProps = {
  visible: boolean;
  /** The field's current text, so fixing a typo is one edit away. */
  initialText: string;
  /** Always a plain name: the plan stores the string, never a library id. */
  onSelect: (name: string) => void;
  onClose: () => void;
};

type FetchKey<K> = { q: string; filter: K | null };

type SaveState = { name: string; status: 'saving' | 'saved' | 'failed'; message?: string };

function saveErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 423) {
    return 'Your account is waiting for approval, so you can’t save to your library yet.';
  }
  return describeError(error);
}

/**
 * A combobox over the library, not a strict dropdown: whatever is typed can
 * always be used as-is from the first row, with saving it to the library a
 * separate, optional step.
 */
export function LibraryPicker<T extends LibraryEntry, K extends string>({
  config,
  visible,
  initialText,
  onSelect,
  onClose,
}: LibraryPickerProps & { config: LibraryPickerConfig<T, K> }) {
  const theme = useTheme();
  const isDesktop = useDesktopLayout();

  const [text, setText] = useState(initialText);
  /** What is being fetched; typing reaches it after a pause, a filter at once. */
  const [fetchKey, setFetchKey] = useState<FetchKey<K>>({ q: initialText.trim(), filter: null });
  const [reloadCount, setReloadCount] = useState(0);
  const [response, setResponse] = useState<{
    key: string;
    q: string;
    data: LibrarySearch<T> | null;
    error: string | null;
  } | null>(null);
  const [saveState, setSaveState] = useState<SaveState | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Start over each time it opens — during render, so the last field's text never flashes up.
  const [isOpen, setIsOpen] = useState(visible);
  if (visible !== isOpen) {
    setIsOpen(visible);
    if (visible) {
      setText(initialText);
      setFetchKey({ q: initialText.trim(), filter: null });
      setSaveState(null);
    }
  }

  const typed = text.trim();
  const currentKey = `${reloadCount}|${fetchKey.filter ?? ''}|${fetchKey.q.toLowerCase()}`;

  useEffect(() => {
    if (typed === fetchKey.q) return;
    const timer = setTimeout(() => setFetchKey((current) => ({ ...current, q: typed })), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [typed, fetchKey.q]);

  const { search } = config;
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    search(fetchKey.q, fetchKey.filter).then(
      (data) => {
        if (!cancelled) setResponse({ key: currentKey, q: fetchKey.q, data, error: null });
      },
      (error: unknown) => {
        if (cancelled) return;
        setResponse((last) => ({ key: currentKey, q: fetchKey.q, data: last?.data ?? null, error: describeError(error) }));
      },
    );
    // A slower, older search must not land over a newer one.
    return () => {
      cancelled = true;
    };
  }, [visible, fetchKey, currentKey, search]);

  const choose = (name: string) => {
    onSelect(name);
    onClose();
  };

  const applyFilter = (filter: K | null) => setFetchKey({ q: typed, filter });

  const saveTyped = async () => {
    const name = typed;
    setSaveState({ name, status: 'saving' });
    try {
      await config.save(name);
      setSaveState({ name, status: 'saved' });
    } catch (error) {
      // Already there is as good as saved.
      if (error instanceof ApiError && error.status === 409) setSaveState({ name, status: 'saved' });
      else setSaveState({ name, status: 'failed', message: saveErrorMessage(error) });
    }
  };

  const isLoading = response?.key !== currentKey;
  const error = !isLoading ? response?.error : null;
  const data = response?.data ?? null;
  /** Only for the text it was saved under; editing the text offers the action again. */
  const typedSave = saveState?.name === typed ? saveState : null;
  // A recent name with no entry came from a plan, not the library, so it can still be saved.
  const knownNames = data ? [...data.results, ...data.recent.flatMap((item) => (item.entry ? [item.entry] : []))] : [];
  const alreadyInLibrary = !isLoading && hasExactName(knownNames, typed);

  const filterOptions: { value: K | null; label: string }[] = [{ value: null, label: 'All' }, ...config.filters];
  const filterChips = filterOptions.map((option) => {
    const selected = option.value === fetchKey.filter;
    return (
      <Pressable
        key={option.value ?? 'all'}
        accessibilityRole="radio"
        aria-checked={selected}
        onPress={() => applyFilter(option.value)}
        hitSlop={(HitTarget - FILTER_HEIGHT) / 2}
        style={({ pressed }) => [
          styles.filter,
          selected
            ? { backgroundColor: theme.primary, borderColor: theme.primary }
            : { backgroundColor: pressed ? theme.chipBg : theme.surface, borderColor: theme.border },
        ]}>
        <ThemedText type="chip" themeColor={selected ? 'onPrimary' : 'textSecondary'}>
          {option.label}
        </ThemedText>
      </Pressable>
    );
  });

  const header = (
    <>
      <TextField
        value={text}
        onChangeText={setText}
        placeholder={config.searchPlaceholder}
        accessibilityLabel={config.searchPlaceholder}
        ref={inputRef}
        autoCorrect={false}
        returnKeyType="done"
        // Enter uses the text as typed, like the first row.
        onSubmitEditing={() => {
          if (typed) choose(typed);
        }}
        trailing={
          text ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear"
              onPress={() => setText('')}
              style={styles.fieldIcon}>
              <SymbolView name={CLEAR_ICON} size={18} tintColor={theme.textMuted} />
            </Pressable>
          ) : (
            <View style={styles.fieldIcon}>
              <SymbolView name={SEARCH_ICON} size={18} tintColor={theme.textMuted} />
            </View>
          )
        }
      />

      {isDesktop ? (
        <View accessibilityRole="radiogroup" accessibilityLabel={config.filterLabel} style={styles.filtersWrap}>
          {filterChips}
        </View>
      ) : (
        <ScrollView
          horizontal
          accessibilityRole="radiogroup"
          accessibilityLabel={config.filterLabel}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.filters}>
          {filterChips}
        </ScrollView>
      )}

      {typed ? (
        <View style={[styles.useRow, { backgroundColor: theme.chipBg, borderColor: theme.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Use ${typed}`}
            onPress={() => choose(typed)}
            style={({ pressed }) => [styles.useMain, pressed && styles.pressed]}>
            <SymbolView name={USE_ICON} size={16} tintColor={theme.chipText} />
            <ThemedText type="smallBold" themeColor="chipText" numberOfLines={2} style={styles.useText}>
              Use “{typed}”
            </ThemedText>
          </Pressable>

          {typedSave?.status === 'saved' ? (
            <View style={styles.saveNote}>
              <SymbolView name={SAVED_ICON} size={14} tintColor={theme.success} />
              <ThemedText type="meta" themeColor="success">
                {config.savedLabel}
              </ThemedText>
            </View>
          ) : alreadyInLibrary ? null : (
            <Button
              label={config.saveLabel}
              variant="ghost"
              size="sm"
              onPress={() => void saveTyped()}
              loading={typedSave?.status === 'saving'}
            />
          )}
          {typedSave?.status === 'failed' ? (
            <ThemedText type="meta" themeColor="danger" style={styles.saveError}>
              {typedSave.message}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </>
  );

  const renderEntry = (key: string, name: string, entry: T | null) => (
    <Row key={key} onPress={() => choose(name)} chevron={false} accessibilityLabel={`Use ${name}`}>
      {entry?.imageUrl ? (
        <Image
          source={{ uri: entry.imageUrl }}
          accessibilityIgnoresInvertColors
          style={[styles.thumb, { backgroundColor: theme.surfaceInset }]}
        />
      ) : null}
      <View style={styles.entryCopy}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {name}
        </ThemedText>
        {entry ? config.details(entry) : null}
      </View>
      {entry && !entry.isGlobal ? <Chip label="Yours" /> : null}
    </Row>
  );

  const renderGroup = (key: string, title: string, rows: ReactNode[]) => (
    <View key={key} style={styles.group}>
      <View style={styles.groupHeader}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="meta">{rows.length}</ThemedText>
      </View>
      <InsetPanel>{rows}</InsetPanel>
    </View>
  );

  const labelFor = (key: K | null) =>
    key === null ? config.ungroupedLabel : (config.filters.find((option) => option.value === key)?.label ?? key);

  let body: ReactNode;
  if (error) {
    body = (
      <View style={styles.state}>
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
        <Button label="Try again" variant="secondary" size="sm" onPress={() => setReloadCount((count) => count + 1)} />
      </View>
    );
  } else if (!data) {
    body = <ActivityIndicator color={theme.textSecondary} />;
  } else if (data.results.length === 0 && data.recent.length === 0) {
    body = (
      <ThemedText type="small" themeColor="textSecondary">
        {response?.q
          ? `Nothing in the library matches “${response.q}”. Use it as typed above.`
          : fetchKey.filter
            ? `No ${config.noun} under ${labelFor(fetchKey.filter)} yet.`
            : `No ${config.noun} in the library yet. Type a name above to use it.`}
      </ThemedText>
    );
  } else {
    const groups = groupResults(
      data.results,
      config.groupOf,
      config.filters.map((option) => option.value),
      Boolean(response?.q),
    );
    body = (
      <View style={[styles.results, isLoading && styles.stale]}>
        {data.recent.length > 0
          ? renderGroup(
              'recent',
              'Recently used',
              data.recent.map((item) => renderEntry(`recent-${item.name}`, item.name, item.entry)),
            )
          : null}
        {groups.map((group) =>
          renderGroup(
            group.key ?? 'ungrouped',
            labelFor(group.key),
            group.items.map((item) => renderEntry(item.id, item.name, item)),
          ),
        )}
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={config.title}
      header={header}
      onShow={() => inputRef.current?.focus()}>
      {body}
    </Modal>
  );
}

type PickerFieldProps = {
  value: string;
  placeholder: string;
  /** Names the field, e.g. "Exercise name". */
  accessibilityLabel: string;
  onPress: () => void;
};

/** Looks like a text field; opens the picker, where the typing happens. */
export function PickerField({ value, placeholder, accessibilityLabel, onPress }: PickerFieldProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${accessibilityLabel}: ${value}` : accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pickerField,
        { borderColor: theme.borderInput, backgroundColor: pressed ? theme.surfaceInset : theme.surface },
      ]}>
      <ThemedText themeColor={value ? 'textPrimary' : 'textMuted'} numberOfLines={1} style={styles.pickerValue}>
        {value || placeholder}
      </ThemedText>
      <SymbolView name={SEARCH_ICON} size={18} tintColor={theme.textMuted} />
    </Pressable>
  );
}

const FILTER_HEIGHT = 32;
const THUMB_SIZE = 44;

const styles = StyleSheet.create({
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  pickerValue: {
    flex: 1,
  },
  fieldIcon: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    minWidth: HitTarget,
  },
  filters: {
    gap: Spacing.two,
  },
  filtersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  filter: {
    height: FILTER_HEIGHT,
    paddingHorizontal: Spacing.twoHalf,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  useMain: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 160,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: HitTarget,
  },
  useText: {
    flexShrink: 1,
  },
  saveNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: HitTarget,
  },
  saveError: {
    flexBasis: '100%',
    paddingBottom: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
  results: {
    gap: Spacing.four,
  },
  stale: {
    opacity: 0.6,
  },
  group: {
    gap: Spacing.two,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: Radii.sm,
  },
  entryCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  state: {
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
});
