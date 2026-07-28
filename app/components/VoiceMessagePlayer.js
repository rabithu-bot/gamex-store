"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Play, Pause } from "lucide-react";

const BAR_COUNT = 28;

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
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

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
        audio.currentTime = 1e101;
        const onTimeUpdate = () => {
          audio.removeEventListener("timeupdate", onTimeUpdate);
          setDuration(audio.duration);
          audio.currentTime = 0;
        };
        audio.addEventListener("timeupdate", onTimeUpdate);
      } else {
        setDuration(audio.duration);
      }
    }

    function onTimeUpdate() {
      setCurrentTime(audio.currentTime);
    }
    function onEnded() {
      setPlaying(false);
      setCurrentTime(0);
    }

    audio.addEventListener("loadedmetadata", readDuration);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", readDuration);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  }

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

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
