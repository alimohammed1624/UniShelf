'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  PDFDocumentProxy,
  RenderTask,
} from 'pdfjs-dist/types/src/display/api';
import { Button } from '@/components/ui/button';

interface PdfPreviewProps {
  url: string;
  title: string;
  onError: () => void;
}

export function PdfPreview({ url, title, onError }: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => setContainerWidth(container.clientWidth);
    const observer = new ResizeObserver(updateWidth);

    updateWidth();
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadedDocument: PDFDocumentProxy | null = null;

    async function loadDocument() {
      try {
        setRendering(true);
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();

        const nextDocument = await pdfjs.getDocument(url).promise;
        loadedDocument = nextDocument;
        if (cancelled) {
          await nextDocument.destroy();
          return;
        }

        setPage(1);
        setDocument(nextDocument);
      } catch {
        if (!cancelled) onError();
      }
    }

    void loadDocument();
    return () => {
      cancelled = true;
      if (loadedDocument) void loadedDocument.destroy();
    };
  }, [onError, url]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!document || !canvas || containerWidth === 0) return;

    const currentDocument = document;
    const currentCanvas = canvas;
    let cancelled = false;
    let renderTask: RenderTask | null = null;

    async function renderPage() {
      try {
        setRendering(true);
        const pdfPage = await currentDocument.getPage(page);
        if (cancelled) return;

        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const cssScale = (containerWidth / baseViewport.width) * (zoom / 100);
        const viewport = pdfPage.getViewport({ scale: cssScale });
        const outputScale = window.devicePixelRatio || 1;
        const context = currentCanvas.getContext('2d');
        if (!context) throw new Error('Canvas is unavailable');

        currentCanvas.width = Math.floor(viewport.width * outputScale);
        currentCanvas.height = Math.floor(viewport.height * outputScale);
        currentCanvas.style.width = `${viewport.width}px`;
        currentCanvas.style.height = `${viewport.height}px`;
        setPageWidth(viewport.width);

        renderTask = pdfPage.render({
          canvasContext: context,
          viewport,
          transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
        });
        await renderTask.promise;
        if (!cancelled) setRendering(false);
      } catch (error) {
        if (!cancelled && !(error instanceof Error && error.name === 'RenderingCancelledException')) {
          onError();
        }
      }
    }

    void renderPage();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [containerWidth, document, onError, page, zoom]);

  const numberOfPages = document?.numPages ?? 0;
  const isFirstPage = page === 1;
  const isLastPage = numberOfPages > 0 && page === numberOfPages;

  return (
    <div
      className={
        fullscreen
          ? 'fixed inset-4 z-50 space-y-3 rounded-md border bg-background p-4 shadow-xl'
          : 'space-y-3'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={isFirstPage}
          >
            Prev
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setPage((current) => Math.min(numberOfPages, current + 1))}
            disabled={!numberOfPages || isLastPage}
          >
            Next
          </Button>
        </div>

        <div className="mx-1 hidden h-5 w-px bg-border sm:block" />

        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setZoom((current) => Math.max(50, current - 10))}
            disabled={zoom <= 50}
          >
            -
          </Button>
          <span className="min-w-12 text-center text-sm text-muted-foreground">{zoom}%</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setZoom((current) => Math.min(300, current + 10))}
            disabled={zoom >= 300}
          >
            +
          </Button>
        </div>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setFullscreen((current) => !current)}
        >
          {fullscreen ? 'Exit full screen' : 'Full screen'}
        </Button>
      </div>

      <div
        ref={containerRef}
        className={`${fullscreen ? 'h-[calc(100%_-_3rem)]' : 'h-[60vh]'} relative w-full overflow-auto rounded-md border bg-muted/10`}
        aria-label={title}
      >
        {rendering && (
          <div className="absolute inset-x-0 top-0 z-10 bg-background/80 p-2 text-center text-sm text-muted-foreground">
            Rendering page...
          </div>
        )}
        <div
          className="min-h-full"
          style={{ width: pageWidth ? `${pageWidth}px` : '100%', minWidth: '100%' }}
        >
          <canvas ref={canvasRef} className="mx-auto block bg-white shadow-sm" />
        </div>
      </div>
    </div>
  );
}
