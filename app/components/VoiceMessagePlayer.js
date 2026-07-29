"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Play, Pause, AlertCircle } from "lucide-react";

const BAR_COUNT = 28;

// Telegram/WhatsApp only ever play one voice note at a time — starting a
// new one pauses whatever else was playing across the whole page, not just
// within one thread. Module-level so it's shared across every mounted
// player instance without prop-drilling a shared player context through
// two different chat components (admin + buyer).
let currentlyPlayingAudio = null;

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Telegram/Instagram-style voice note UI over the browser's own <audio>
// element — its native `controls` UI looks like a generic OS/Chrome media
// bar, so playback is driven programmatically instead and rendered as a
// play button + a bar "waveform" (decorative, not derived from the actual
// audio's amplitude data — a real waveform needs decoding the whole file
// up front, which isn't worth it just to look like Telegram).
export default function VoiceMessagePlayer({ src }) {
  const audioRef = useRef(null);
  const fixingDurationRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errored, setErrored] = useState(false);

  const bars = useMemo(
    () => Array.from({ length: BAR_COUNT }, (_, i) => 30 + Math.round(Math.abs(Math.sin(i * 12.9898)) * 70)),
    []
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function readDuration() {
      // MediaRecorder-produced webm blobs are a known Chrome case where
      // .duration reports Infinity/NaN until playback is forced past the
      // end once — seek-to-end-then-back-to-zero is the standard workaround.
      if (!Number.isFinite(audio.duration)) {
        fixingDurationRef.current = true;
        audio.currentTime = 1e101;
        const onTimeUpdate = () => {
          audio.removeEventListener("timeupdate", onTimeUpdate);
          setDuration(audio.duration);
          audio.currentTime = 0;
          fixingDurationRef.current = false;
        };
        audio.addEventListener("timeupdate", onTimeUpdate);
      } else {
        setDuration(audio.duration);
      }
    }

    function onTimeUpdate() {
      // The duration-detection seek above also fires this same listener —
      // skip it so the elapsed-time label doesn't flash a bogus huge value
      // before snapping back to 0.
      if (fixingDurationRef.current) return;
      setCurrentTime(audio.currentTime);
    }
    function onEnded() {
      setPlaying(false);
      setCurrentTime(0);
    }
    function onError() {
      setErrored(true);
      setPlaying(false);
    }
    function onPause() {
      setPlaying(false);
    }

    audio.addEventListener("loadedmetadata", readDuration);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("loadedmetadata", readDuration);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("pause", onPause);
      if (currentlyPlayingAudio === audio) currentlyPlayingAudio = null;
    };
  }, []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || errored) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    if (currentlyPlayingAudio && currentlyPlayingAudio !== audio) {
      currentlyPlayingAudio.pause();
    }
    currentlyPlayingAudio = audio;
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setErrored(true));
  }

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  if (errored) {
    return (
      <div className="voice-player voice-player-error">
        <AlertCircle size={15} />
        <span className="voice-player-time">Couldn&apos;t play this voice message</span>
      </div>
    );
  }

  return (
    <div className="voice-player">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={src} preload="metadata" style={{ display: "none" }} />
      <button
        type="button"
        className="voice-player-btn"
        onClick={togglePlay}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
      >
        {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
      </button>
      <div className="voice-player-bars">
        {bars.map((h, i) => (
          <span
            key={i}
            className={`voice-player-bar${i / BAR_COUNT < progress ? " filled" : ""}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <span className="voice-player-time">
        {formatDuration(currentTime)} / {formatDuration(duration)}
      </span>
    </div>
  );
}
