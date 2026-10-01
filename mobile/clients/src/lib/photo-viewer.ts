import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { setPhotoViewerContent, type ViewerPhoto } from '@coachos/theme';

/** Opens the full-screen viewer on `photos[index]`, swiping through the rest. */
export function useOpenPhotoViewer() {
  const router = useRouter();
  return useCallback(
    (photos: ViewerPhoto[], index: number) => {
      setPhotoViewerContent({ photos, index });
      router.push('/photo-viewer');
    },
    [router],
  );
}
