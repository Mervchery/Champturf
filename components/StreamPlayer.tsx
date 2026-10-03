"use client";

import { useT } from "@/components/LanguageProvider";
import { useEffect, useRef, useState } from "react";
import type { Stream } from "@/lib/streams";

// Safari plays HLS (.m3u8) natively. Chrome, Firefox and Edge don't, so we
// load hls.js on demand. It's dynamically imported so it only downloads for
// viewers who actually need it.
function HlsVideo({ src }: { src: string }) {
  const { t, lang } = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setError("");

    let hls: import("hls.js").default | null = null;
    let cancelled = false;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari / iOS: native playback
      video.src = src;
      video.play().catch(() => {});
    } else {
      import("hls.js")
        .then(({ default: Hls }) => {
          if (cancelled) return;
          if (!Hls.isSupported()) {
            setError("This browser can't play the live stream.");
            return;
          }
          hls = new Hls({ lowLatencyMode: true });
          hls.loadSource(src);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {}); // autoplay may be blocked; controls still work
          });
          hls.on(Hls.Events.ERROR, (_evt, data) => {
            if (!data.fatal) return;
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls?.startLoad(); // transient network issue: retry
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls?.recoverMediaError();
            } else {
              setError("The stream stopped. It may not have started yet.");
              hls?.destroy();
            }
          });
        })
        .catch(() => setError("Couldn't load the video player."));
    }

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src, attempt]);

  return (
    <>
      <video ref={videoRef} className="w-full h-full" controls autoPlay muted playsInline />
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-white text-sm text-center px-6">
          <span>{t(error)}</span>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="bg-coral text-white text-xs font-semibold px-3 py-1.5 rounded-full"
          >
            {t("Try again")}
          </button>
        </div>
      )}
    </>
  );
}

export default function StreamPlayer({ stream }: { stream: Stream }) {
  if (stream.source === "rtmp") {
    // embed_url must be a direct .m3u8 HLS URL (browsers can't play RTMP).
    return <HlsVideo src={stream.embed_url} />;
  }
  // youtube / facebook / twitch: iframe embeds using the embeddable URL
  // format documented in supabase/streams_schema.sql.
  return (
    <iframe
      className="w-full h-full"
      src={stream.embed_url}
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  );
}
