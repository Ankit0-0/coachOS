import Image, { type StaticImageData } from 'next/image';

type ScreenshotProps = {
  image: StaticImageData;
  /** What the screenshot shows, e.g. "WhatsApp". Becomes the alt text. */
  alt: string;
  /** Sizes hint for the image, so the browser fetches a sensible resolution. */
  sizes: string;
  /**
   * `width` fills the frame's width and takes its height from the image —
   * for a grid of equal columns. `height` is the other way round: the frame
   * is given a height and hugs whatever width the image needs, which is how
   * the hero keeps its row inside the viewport.
   */
  fit?: 'width' | 'height';
  /** Applied to the frame, not the image — width, placement, rounding. */
  className?: string;
  priority?: boolean;
};

/**
 * One phone screenshot in a frame.
 *
 * The image is imported statically, so next/image gets the file's real pixel
 * dimensions and keeps its native aspect ratio. Nothing is cropped: the whole
 * screen shows, status bar to bottom edge.
 *
 * These screenshots are all the same shape. If a set ever mixes aspect ratios,
 * letterbox rather than crop: wrap the image in a frame fixed at the common
 * ratio, give the image `object-contain`, and let the frame's `bg-panel` show
 * as the bars. Never `object-cover` — that is what cut the tops and bottoms off
 * these screenshots before.
 */
export function Screenshot({ image, alt, sizes, fit = 'width', className = '', priority = false }: ScreenshotProps) {
  const isHeightLed = fit === 'height';

  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/10 bg-panel ${
        isHeightLed ? 'w-fit shrink-0' : ''
      } ${className}`}
    >
      <Image
        src={image}
        alt={alt}
        sizes={sizes}
        priority={priority}
        className={isHeightLed ? 'h-full w-auto' : 'h-auto w-full'}
      />
    </div>
  );
}
