import Image from 'next/image';
import { ScanSearch } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ImageViewerProps {
  /** Data URL or remote URL of the original scan. */
  src: string | null | undefined;
  alt: string;
  caption?: string;
}

/**
 * Original-scan preview panel. Uses checkerboard backing so transparent PNG
 * regions are visible, and next/image with unoptimized data URLs.
 */
export function ImageViewer({ src, alt, caption }: ImageViewerProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ScanSearch className="h-4 w-4 text-primary" aria-hidden />
          Original scan
        </CardTitle>
        {caption && <CardDescription className="truncate">{caption}</CardDescription>}
      </CardHeader>
      <CardContent>
        {src ? (
          <div className="checkerboard relative overflow-hidden rounded-md border">
            <Image
              src={src}
              alt={alt}
              width={0}
              height={0}
              sizes="(max-width: 1024px) 100vw, 640px"
              className="h-auto max-h-[560px] w-full object-contain"
              unoptimized // data URLs & DICOM-derived previews bypass the optimizer
            />
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            No image was provided for this case.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
