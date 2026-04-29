"use client";

import { useEffect, useRef, useState } from "react";

const DOCX_PAGE_WIDTH_PX = 816; // docx-preview renders at this fixed width

export default function DocsPreview({
  link,
  title,
}: {
  link: string;
  title: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Scale the fixed-width docx output to fill the wrapper
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const container = containerRef.current;
    if (!wrapper || !container) return;

    const observer = new ResizeObserver(() => {
      const scale = Math.min(1, wrapper.clientWidth / DOCX_PAGE_WIDTH_PX);
      container.style.transform = `scale(${scale})`;
      container.style.transformOrigin = "top left";
      container.style.width = `${DOCX_PAGE_WIDTH_PX}px`;
      wrapper.style.height = `${container.scrollHeight * scale}px`;
    });

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [loading]);

  // Fetch and render
  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const [{ renderAsync }, response] = await Promise.all([
          import("docx-preview"),
          fetch(link),
        ]);

        if (cancelled) return;

        if (!response.ok) {
          setError("Failed to fetch document.");
          return;
        }

        const blob = await response.blob();
        if (cancelled) return;

        await renderAsync(blob, containerRef.current!, undefined, {
          className: "docx-preview",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          useBase64URL: true,
        });

        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to render document.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [link]);

  if (error) {
    return (
      <div className="flex h-full min-h-64 items-center justify-center">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-900">Preview unavailable</p>
          <p className="mt-1.5 text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-x-hidden">
      {loading && (
        <div className="flex min-h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
            <p className="text-sm text-slate-400">Loading document…</p>
          </div>
        </div>
      )}
      {/* wrapperRef tracks available width; containerRef holds the fixed-width docx output */}
      <div ref={wrapperRef} className="w-full">
        <div ref={containerRef} title={title} />
      </div>
    </div>
  );
}
