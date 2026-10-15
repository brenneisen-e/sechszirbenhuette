'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMotion } from '@/contexts/MotionContext';
import { BookingCTA } from '@/components/brand/BookingCTA';

// Aufmacher: das bestehende Hüttenvideo (Medienkategorie „hero“, Cloudflare
// Stream/HLS) bleibt die prägende Medienfläche. Leitidee, Ort und Buchen stehen
// auf einer ruhigen, deckenden grünen Fläche daneben (mobil darunter) — nie
// über dem laufenden Film.
//
// Wiedergabe: stumm, inline, in Schleife, unabhängig vom Scrollen. Automatischer
// Start nur ohne reduzierte Bewegung. Außerhalb des Sichtbereichs oder bei
// verdecktem Tab pausiert der Film; eine bewusste Pause wird nie automatisch
// aufgehoben. Poster ist ein Standbild aus genau diesem Film.

type HlsLike = { destroy: () => void };

export function Hero() {
  const { t } = useLanguage();
  const { reduced } = useMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsLike | null>(null);
  const userPausedRef = useRef(false);
  const autoPausedRef = useRef(false);
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  // Videoquelle und Poster aus der Medienverwaltung
  useEffect(() => {
    let cancelled = false;
    fetch('/api/media?category=hero&type=video', { cache: 'no-store' })
      .then((res) => res.json() as Promise<{ media?: { url: string }[] }>)
      .then((data) => {
        const url = data.media?.[0]?.url;
        if (cancelled) return;
        if (!url) {
          setFailed(true);
          return;
        }
        setVideoUrl(url);
        // Standbild aus demselben Stream-Video (Sekunde 1 = Startbild der Schleife)
        const uid = url.match(/cloudflarestream\.com\/([a-f0-9]+)\//)?.[1];
        const host = url.match(/^https:\/\/([^/]+)\//)?.[1];
        if (uid && host) {
          setPosterUrl(
            `https://${host}/${uid}/thumbnails/thumbnail.jpg?time=1s&width=1920&height=1080`,
          );
        }
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // Kein Stream-Standbild: hinterlegtes Vorschaubild verwenden
  useEffect(() => {
    if (posterUrl || !failed) return;
    fetch('/api/media?category=hero-thumbnail&type=image', { cache: 'no-store' })
      .then((res) => res.json() as Promise<{ media?: { url: string }[] }>)
      .then((data) => data.media?.[0]?.url && setPosterUrl(data.media[0].url))
      .catch(() => {});
  }, [failed, posterUrl]);

  const tryAutoplay = useCallback(() => {
    const video = videoRef.current;
    if (!video || reducedRef.current || userPausedRef.current) return;
    video.muted = true;
    video.play().catch(() => {
      // Autoplay blockiert: Poster bleibt, Start über den Schalter
    });
  }, []);

  // HLS anbinden (Safari/iOS nativ, sonst hls.js)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    let cancelled = false;
    video.muted = true;
    video.defaultMuted = true;

    const onReady = () => {
      if (cancelled) return;
      setReady(true);
      if (video.currentTime < 1) video.currentTime = 1;
      tryAutoplay();
    };

    const attach = async () => {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = videoUrl;
        video.addEventListener('loadedmetadata', onReady, { once: true });
        return;
      }
      try {
        const Hls = (await import('hls.js')).default;
        if (cancelled) return;
        if (!Hls.isSupported()) {
          video.src = videoUrl;
          video.addEventListener('loadedmetadata', onReady, { once: true });
          return;
        }
        const small = window.matchMedia('(max-width: 767px)').matches;
        const hls = new Hls({
          enableWorker: false,
          maxBufferLength: small ? 15 : 30,
          maxMaxBufferLength: small ? 30 : 60,
          startLevel: small ? 0 : -1,
        });
        hls.on(Hls.Events.ERROR, (_e: string, data: { fatal: boolean; type: string }) => {
          if (!data.fatal) return;
          if (data.type === 'networkError') {
            hls.startLoad();
          } else {
            hls.destroy();
            hlsRef.current = null;
            if (!cancelled) setFailed(true);
          }
        });
        hls.on(Hls.Events.MANIFEST_PARSED, onReady);
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
        hlsRef.current = hls;
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    attach();

    return () => {
      cancelled = true;
      video.removeEventListener('loadedmetadata', onReady);
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [videoUrl, tryAutoplay]);

  // Außerhalb des Sichtbereichs und bei verdecktem Tab pausieren
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !ready) return;
    const pauseAuto = () => {
      if (!video.paused) {
        autoPausedRef.current = true;
        video.pause();
      }
    };
    const resumeAuto = () => {
      if (!autoPausedRef.current || userPausedRef.current) return;
      autoPausedRef.current = false;
      video.play().catch(() => {});
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) resumeAuto();
        else pauseAuto();
      },
      { threshold: 0.15 },
    );
    observer.observe(video);
    const onVisibility = () => (document.hidden ? pauseAuto() : resumeAuto());
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [ready]);

  // Wechsel auf reduzierte Bewegung pausiert einen automatisch laufenden Film
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !ready) return;
    if (reduced && !video.paused && !userPausedRef.current) {
      video.pause();
      autoPausedRef.current = false;
    }
  }, [reduced, ready]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      userPausedRef.current = false;
      autoPausedRef.current = false;
      video.muted = true;
      video.play().catch(() => setFailed(true));
    } else {
      userPausedRef.current = true;
      video.pause();
    }
  };

  return (
    <section id="hero" aria-labelledby="hero-title" className="bg-zirbe">
      <div className="lg:grid lg:min-h-[max(560px,calc(100svh-var(--header-height)))] lg:grid-cols-12">
        {/* Film: großzügig, mobil oben */}
        <div className="relative h-[46svh] min-h-[260px] overflow-hidden bg-zirbe lg:order-2 lg:col-span-7 lg:h-auto">
          <video
            ref={videoRef}
            id="hero-video"
            muted
            loop
            playsInline
            disablePictureInPicture
            preload="metadata"
            poster={posterUrl || undefined}
            aria-label={t.brand.videoLabel}
            className="absolute inset-0 h-full w-full object-cover object-[50%_60%]"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => setFailed(true)}
          />
          {(ready || posterUrl) && !failed && (
            <button
              type="button"
              onClick={toggle}
              disabled={!ready}
              aria-pressed={!playing}
              className="absolute bottom-4 left-4 inline-flex min-h-[44px] items-center gap-2 rounded-[4px] bg-zirbe px-4 text-[0.9375rem] text-leinen hover:bg-[#2f4a41] disabled:opacity-70 md:bottom-6 md:left-6"
            >
              {playing ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
              {playing ? t.brand.videoPause : t.brand.videoPlay}
            </button>
          )}
        </div>

        {/* Ruhige, deckende grüne Fläche für Leitidee und Buchen */}
        <div className="on-zirbe flex flex-col justify-center bg-zirbe text-leinen lg:order-1 lg:col-span-5">
          <div className="px-6 py-10 sm:px-12 md:py-14 lg:py-16 xl:pl-[max(3rem,calc((100vw-1280px)/2))] xl:pr-16">
            <p className="brand-label text-holz">{t.brand.place}</p>
            <h1 id="hero-title" className="mt-6">
              <span className="brand-h1 block text-leinen">{t.brand.claim}</span>
              <span className="brand-hand mt-2 block text-leinen">{t.brand.claimHand}</span>
            </h1>
            <p className="mt-6 max-w-[30rem] text-leinen">{t.brand.heroText}</p>
            <div className="mt-8">
              <BookingCTA />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
