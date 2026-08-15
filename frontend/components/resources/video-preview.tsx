'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

export type VideoKind = 'file' | 'direct-link' | 'embed';

export interface VideoSource {
  kind: VideoKind;
  src: string;
}

const DIRECT_VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov', 'm3u8'];

function isDirectVideoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const extension = parsed.pathname.split('.').pop()?.toLowerCase();
    return DIRECT_VIDEO_EXTENSIONS.includes(extension ?? '');
  } catch {
    return false;
  }
}

// YouTube/Vimeo links never end in a video file extension, so they need
// their own host-based check and get rendered as an iframe embed instead
// of a <video> element (which can't play a page URL).
function getEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '');

  if (host === 'youtube.com') {
    const id = parsed.searchParams.get('v');
    if (id) return `https://www.youtube.com/embed/${id}`;
    const match = parsed.pathname.match(/^\/(embed|live|shorts)\/([\w-]+)/);
    return match ? `https://www.youtube.com/embed/${match[2]}` : null;
  }
  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1).split('/')[0];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (host === 'vimeo.com') {
    const match = parsed.pathname.match(/^\/(\d+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}` : null;
  }
  return null;
}

export function detectVideoSource(
  type: string | undefined,
  filePath: string | null | undefined,
  inlinePreviewUrl: string,
): VideoSource | null {
  if (type?.startsWith('video/')) {
    return inlinePreviewUrl ? { kind: 'file', src: inlinePreviewUrl } : null;
  }
  if (type !== 'link' || !filePath) return null;
  if (isDirectVideoUrl(filePath)) return { kind: 'direct-link', src: filePath };
  const embedUrl = getEmbedUrl(filePath);
  return embedUrl ? { kind: 'embed', src: embedUrl } : null;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface VideoPreviewProps {
  kind: VideoKind;
  src: string;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function VideoPreview({ kind, src, fullscreen, onToggleFullscreen }: VideoPreviewProps) {
  const [duration, setDuration] = useState<number | null>(null);
  const [resolution, setResolution] = useState<{ width: number; height: number } | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // A <video src=...> is fetched by the browser itself, not through the
  // app's axios instance — it never carries the Authorization header, so
  // the authenticated download endpoint 401s and nothing plays. Fetch it
  // through `api` first and hand the player a blob: URL instead, same as
  // pdf-preview.tsx / the image preview effect above do for the same
  // reason. Direct links and embeds point at third-party hosts and don't
  // go through our auth at all, so they skip this.
  useEffect(() => {
    if (kind !== 'file') {
      setBlobUrl(null);
      return;
    }

    let cancelled = false;
    let localUrl: string | null = null;
    setLoading(true);
    setLoadFailed(false);

    api
      .get(src, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        localUrl = URL.createObjectURL(res.data);
        setBlobUrl(localUrl);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [kind, src]);

  const playableSrc = kind === 'file' ? blobUrl : src;
  // Embeds are a cross-origin iframe — there's no metadata to read from them.
  const showMetadata = kind !== 'embed' && duration !== null && resolution !== null;

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          Video preview
          {showMetadata && (
            <span className="ml-2 text-xs">
              {formatDuration(duration!)} · {resolution!.width}×{resolution!.height}
            </span>
          )}
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={onToggleFullscreen}>
          {fullscreen ? 'Exit full screen' : 'Full screen'}
        </Button>
      </div>
      <div
        className={`flex ${fullscreen ? 'h-[75vh]' : 'h-[60vh]'} items-center justify-center overflow-hidden rounded-md border bg-muted/10`}
      >
        {kind === 'embed' ? (
          <iframe
            src={src}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading video preview...</div>
        ) : loadFailed || !playableSrc ? (
          <div className="p-4 text-sm text-muted-foreground">Video preview is unavailable for this resource.</div>
        ) : (
          <video
            src={playableSrc}
            controls
            className="max-h-full max-w-full object-contain"
            onLoadedMetadata={(e) => {
              const el = e.currentTarget;
              setDuration(el.duration);
              setResolution({ width: el.videoWidth, height: el.videoHeight });
            }}
          >
            Your browser does not support the HTML5 video player.
          </video>
        )}
      </div>
    </div>
  );
}
