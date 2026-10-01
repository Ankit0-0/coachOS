import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { PhotoViewer, photoViewerContent } from '@coachos/theme';

/** Full-screen photos over whatever opened them; see lib/photo-viewer. */
export default function PhotoViewerRoute() {
  const router = useRouter();
  const [content] = useState(photoViewerContent);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  // A reload on web lands here with nothing to show.
  useEffect(() => {
    if (!content) close();
  }, [content, close]);

  if (!content) return null;
  return <PhotoViewer photos={content.photos} initialIndex={content.index} onClose={close} />;
}
