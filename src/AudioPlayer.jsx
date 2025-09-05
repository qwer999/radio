import { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';

export default function AudioPlayer({ src, nowPlaying, onPlaybackStateChange }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!src) return;
    let hls;
    const audio = audioRef.current;
    if (audio) {
      if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(audio);
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
          audio.play().catch((e) => console.log('자동 재생 실패:', e));
        });

        // 일시정지 시 네트워크 중단, 재생 시 재시작
        audio.addEventListener('pause', () => {
          hls.stopLoad();
        });
        audio.addEventListener('play', () => {
          hls.startLoad();
        });
      } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = src;
        audio.play().catch((e) => console.log('자동 재생 실패:', e));
      } else {
        audio.src = src;
      }

      // 미디어 재생 이벤트 발생 (iOS에서 미디어 세션 활성화)
      audio.addEventListener('play', () => {
        setIsPlaying(true);
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
        if (onPlaybackStateChange) {
          onPlaybackStateChange(true);
        }
      });

      audio.addEventListener('pause', () => {
        setIsPlaying(false);
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused';
        }
        if (onPlaybackStateChange) {
          onPlaybackStateChange(false);
        }
      });
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [src]);

  return (
    <div>
      {nowPlaying && (
        <div className="mb-2 p-2 bg-gray-800 text-white rounded text-sm">
          <div>
            <span className="font-bold">방송정보:</span> {nowPlaying.title}
          </div>
          {nowPlaying.host && (
            <div>
              <span className="font-bold">진행:</span> {nowPlaying.host}
            </div>
          )}
          {nowPlaying.time && (
            <div>
              <span className="font-bold">시간:</span> {nowPlaying.time}
            </div>
          )}
        </div>
      )}
      <audio ref={audioRef} controls autoPlay className="w-full mt-2 bg-black rounded">
        지원되지 않는 브라우저입니다.
      </audio>
    </div>
  );
}
