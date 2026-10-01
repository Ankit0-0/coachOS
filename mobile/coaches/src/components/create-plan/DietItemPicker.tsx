import { LibraryPicker, type LibraryPickerConfig, type LibraryPickerProps } from '@/components/create-plan/LibraryPicker';
import { ThemedText } from '@/components/themed-text';
import { dietItemLibraryApi, type LibraryDietItem, type MealType } from '@/lib/api';
import { MEAL_TYPES } from '@/lib/library';

/** "450 kcal · 30 g protein", or null when neither is known. */
function nutritionLine(item: LibraryDietItem): string | null {
  const parts = [
    item.calories !== null ? `${item.calories} kcal` : null,
    item.proteinG !== null ? `${item.proteinG} g protein` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

const CONFIG: LibraryPickerConfig<LibraryDietItem, MealType> = {
  title: 'Choose meal',
  searchPlaceholder: 'Search or type a meal',
  saveLabel: 'Save to my meals',
  savedLabel: 'Saved to your meals',
  noun: 'meals',
  filterLabel: 'Meal type',
  filters: MEAL_TYPES,
  groupOf: (item) => item.mealType,
  ungroupedLabel: 'Other',
  search: (q, mealType) => dietItemLibraryApi.search({ q, mealType }),
  save: (name) => dietItemLibraryApi.create({ name }),
  details: (item) => {
    const line = nutritionLine(item);
    return line ? <ThemedText type="meta">{line}</ThemedText> : null;
  },
};

/** Picks a meal label from the diet-item library, or takes whatever was typed. */
export function DietItemPicker(props: LibraryPickerProps) {
  return <LibraryPicker config={CONFIG} {...props} />;
}
