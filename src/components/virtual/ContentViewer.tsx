import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** Video: rewinding allowed, skipping ahead blocked; completion unlocks only at the end. */
function GuardedVideo({ url, onEnded }: { url: string; onEnded: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const maxWatched = useRef(0);
  useEffect(() => { maxWatched.current = 0; }, [url]);
  return (
    <video
      ref={ref}
      src={url}
      controls
      controlsList="nodownload noplaybackrate"
      disablePictureInPicture
      onContextMenu={(e) => e.preventDefault()}
      className="w-full rounded-md bg-sidebar"
      onTimeUpdate={() => {
        const v = ref.current;
        if (v && !v.seeking && v.currentTime > maxWatched.current && v.currentTime - maxWatched.current < 1.5) maxWatched.current = v.currentTime;
      }}
      onSeeking={() => {
        const v = ref.current;
        if (v && v.currentTime > maxWatched.current + 0.5) v.currentTime = maxWatched.current;
      }}
      onRateChange={() => { if (ref.current && ref.current.playbackRate > 1) ref.current.playbackRate = 1; }}
      onEnded={() => {
        const v = ref.current;
        if (v && maxWatched.current >= v.duration - 2) onEnded();
      }}
    />
  );
}

/** PDF: every page must scroll into view before completion unlocks. */
function GuardedPdf({ url, onProgress }: { url: string; onProgress: (seen: number, total: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let observer: IntersectionObserver | null = null;
    const container = box.current;
    if (!container) return;
    container.innerHTML = "";
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = worker;
        const doc = await pdfjs.getDocument({ url }).promise;
        const total = doc.numPages;
        const seen = new Set<number>();
        onProgress(0, total);
        observer = new IntersectionObserver((entries) => {
          for (const e of entries) {
            if (e.isIntersecting) seen.add(Number((e.target as HTMLElement).dataset["page"]));
          }
          onProgress(seen.size, total);
        }, { root: container, threshold: 0.5 });
        for (let i = 1; i <= total; i++) {
          if (cancelled) return;
          const page = await doc.getPage(i);
          const width = container.clientWidth - 24;
          const base = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale: (width / base.width) * (window.devicePixelRatio || 1) });
          const canvas = document.createElement("canvas");
          canvas.width = vp.width; canvas.height = vp.height;
          canvas.style.width = `${width}px`;
          canvas.className = "mx-auto mb-3 block rounded border bg-background shadow-sm";
          canvas.dataset["page"] = String(i);
          container.appendChild(canvas);
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas not supported");
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
          observer.observe(canvas);
        }
      } catch (e) { if (!cancelled) setError((e as Error).message); }
    })();
    return () => { cancelled = true; observer?.disconnect(); };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <div ref={box} onContextMenu={(e) => e.preventDefault()} className="h-[70vh] w-full overflow-y-auto rounded-md border bg-muted/40 p-3" />
      {error && <p className="text-sm text-destructive">Couldn't load this PDF: {error}</p>}
    </>
  );
}

export function ContentViewer({ kind, url, onComplete }: { kind: string; url: string; onComplete: () => void }) {
  const [ready, setReady] = useState(false);
  const [pages, setPages] = useState<{ seen: number; total: number }>({ seen: 0, total: 0 });
  useEffect(() => { setReady(false); setPages({ seen: 0, total: 0 }); }, [url]);
  const hint = kind === "video"
    ? (ready ? "Video finished — you can mark it completed." : "Watch the whole video to unlock “Mark as completed”. You can rewind, but not skip ahead.")
    : (ready ? "All pages reviewed — you can mark it completed." : `Scroll through every page to unlock “Mark as completed” (${pages.seen}/${pages.total || "…"} pages reviewed).`);
  return (
    <div className="space-y-2">
      {kind === "video"
        ? <GuardedVideo url={url} onEnded={() => setReady(true)} />
        : <GuardedPdf url={url} onProgress={(seen, total) => { setPages({ seen, total }); if (total > 0 && seen >= total) setReady(true); }} />}
      <p className="text-xs text-muted-foreground">{hint}</p>
      <Button size="sm" disabled={!ready} onClick={onComplete}>Mark as completed</Button>
    </div>
  );
}
