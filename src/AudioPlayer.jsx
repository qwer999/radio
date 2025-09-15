import { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';

export default function AudioPlayer({ src, nowPlaying, onPlaybackStateChange, onTimeUpdate }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedTime, setBufferedTime] = useState(0);

  // 시간을 MM:SS 형식으로 포맷팅
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!src) return;
    let hls;
    const audio = audioRef.current;

    // 이벤트 핸들러 함수들을 변수로 선언하여 나중에 제거할 수 있도록 함
    const handlePlay = () => {
      setIsPlaying(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      if (onPlaybackStateChange) {
        onPlaybackStateChange(true);
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      if (onPlaybackStateChange) {
        onPlaybackStateChange(false);
      }
    };

    // 성능 최적화: timeupdate 이벤트를 throttle
    let lastTimeUpdate = 0;
    const handleTimeUpdate = () => {
      const now = Date.now();
      // 500ms마다만 업데이트 (너무 빈번한 업데이트 방지)
      if (now - lastTimeUpdate < 500) return;
      lastTimeUpdate = now;

      const current = audio.currentTime;
      setCurrentTime(current);

      // 버퍼링된 시간 계산
      if (audio.buffered.length > 0) {
        const buffered = audio.buffered.end(audio.buffered.length - 1);
        setBufferedTime(buffered);
      }

      // 부모 컴포넌트에 시간 정보 전달
      if (onTimeUpdate) {
        onTimeUpdate({
          currentTime: formatTime(current),
          bufferedTime: formatTime(audio.buffered.length > 0 ? audio.buffered.end(audio.buffered.length - 1) : 0),
        });
      }
    };

    const handleHlsPause = () => {
      if (hls) hls.stopLoad();
    };

    const handleHlsPlay = () => {
      if (hls) hls.startLoad();
    };

    if (audio) {
      if (Hls.isSupported()) {
        hls = new Hls({
          startPosition: -1,
          liveSyncDurationCount: 12,
          maxBufferLength: 200,
        });
        hls.loadSource(src);
        hls.attachMedia(audio);
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
          audio.play().catch((e) => console.log('자동 재생 실패:', e));
        });

        // HLS 관련 이벤트 리스너
        audio.addEventListener('pause', handleHlsPause);
        audio.addEventListener('play', handleHlsPlay);
      } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = src;
        audio.play().catch((e) => console.log('자동 재생 실패:', e));
      } else {
        audio.src = src;
      }

      // 일반 오디오 이벤트 리스너
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('timeupdate', handleTimeUpdate);
    }

    // 클린업 함수: 메모리 누수 방지
    return () => {
      if (audio) {
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('pause', handleHlsPause);
        audio.removeEventListener('play', handleHlsPlay);
      }
      if (hls) {
        hls.destroy();
      }
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
