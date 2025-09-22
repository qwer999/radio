import { useState, useEffect, useRef, useCallback } from 'react';
import StationList from './components/StationList';
import ExcludedList from './components/ExcludedList';
import StationCard from './components/StationCard';
import ResetPlaylistButton from './components/ResetPlaylistButton';
import { radioStations as defaultStations } from './assets/radioStations';
import { enrichAllStations } from './assets/radioSchedule';
import AudioPlayer from './AudioPlayer';
import { isCacheValid, clearAllCaches } from './utils/cacheUtils';
import './App.css';
import {
  DndContext,
  rectIntersection,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

// Empty drop area component
const DroppableArea = ({ id }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  // Style change when dragging
  const style = {
    backgroundColor: isOver ? 'rgba(107, 114, 128, 0.5)' : 'transparent',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center text-gray-500 h-24 flex items-center justify-center transition-colors duration-200 select-none"
    >
      여기로 방송국을 드래그하여 제외 목록에 추가할 수 있습니다
    </div>
  );
};

function App() {
  // Get radio stations from local storage
  const getSavedStations = () => {
    const saved = localStorage.getItem('radioStations');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('저장된 방송국 정보를 불러오는데 실패했습니다.', e);
      }
    }
    return defaultStations;
  };

  // Get excluded stations from local storage
  const getSavedExcludedStations = () => {
    const saved = localStorage.getItem('excludedStations');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('제외된 방송국 정보를 불러오는데 실패했습니다.', e);
      }
    }
    return [];
  };

  const [stations, setStations] = useState(getSavedStations);
  const [excludedStations, setExcludedStations] = useState(getSavedExcludedStations);
  const [selected, setSelected] = useState(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nowPlaying, setNowPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeInfo, setTimeInfo] = useState({ currentTime: '--:--', bufferedTime: '--:--' });
  const [activeId, setActiveId] = useState(null); // ID of item being dragged
  const [activeStation, setActiveStation] = useState(null); // Station being dragged
  const [isEditMode, setIsEditMode] = useState(false); // 편집 모드 상태

  // 방송국 정보 가져오기 (MBC, KBS 등)
  useEffect(() => {
    async function loadSchedules() {
      try {
        // 캐시 유효성 검사 - 캐시가 유효하지 않으면 모든 캐시 초기화
        if (!isCacheValid()) {
          console.log('캐시가 만료되었습니다. 모든 캐시를 초기화합니다.');
          clearAllCaches();
        }

        // 방송국에 현재 프로그램 정보 추가
        const enrichedStations = await enrichAllStations(stations);
        setStations(enrichedStations);

        // 제외된 방송국에도 현재 프로그램 정보 추가
        const enrichedExcludedStations = await enrichAllStations(excludedStations);
        setExcludedStations(enrichedExcludedStations);
      } catch (error) {
        console.error('방송 편성표 로딩 오류:', error);
      }
    }

    loadSchedules();

    // 서울 시간대 기준으로 정시부터 15분 단위로 업데이트 설정
    const setupScheduleUpdates = () => {
      const now = new Date();

      // 다음 15분 간격 시간 계산 (00, 15, 30, 45분)
      const minutes = now.getMinutes();
      const nextMinutes = Math.ceil(minutes / 15) * 15;
      const nextTime = new Date();
      nextTime.setMinutes(nextMinutes);
      nextTime.setSeconds(0);
      nextTime.setMilliseconds(0);

      // 현재 시간이 이미 45분이면 다음 정각으로 설정
      if (minutes >= 45) {
        nextTime.setHours(nextTime.getHours() + 1);
        nextTime.setMinutes(0);
      }

      // 다음 업데이트까지 남은 시간 (밀리초)
      const timeUntilNextUpdate = nextTime - now;

      // 첫 번째 업데이트를 위한 타이머
      const initialTimer = setTimeout(() => {
        // 15분 간격 시간에 업데이트 실행
        loadSchedules();

        // 이후부터는 정확히 15분마다 실행
        const intervalId = setInterval(loadSchedules, 15 * 60 * 1000);

        // 초기 타이머 참조 제거
        initialTimerRef.current = null;
        // 인터벌 ID 저장
        intervalIdRef.current = intervalId;
      }, timeUntilNextUpdate);

      // 타이머 참조 저장
      initialTimerRef.current = initialTimer;
    };

    // 타이머와 인터벌 참조를 저장할 ref
    const initialTimerRef = useRef(null);
    const intervalIdRef = useRef(null);

    setupScheduleUpdates();

    // 컴포넌트 언마운트 시 모든 타이머 정리
    return () => {
      if (initialTimerRef.current) {
        clearTimeout(initialTimerRef.current);
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  // 방송국 애니메이션 상태
  const [stationAnimationState, setStationAnimationState] = useState('idle'); // 'idle', 'slide-out', 'slide-in'
  const [displayStation, setDisplayStation] = useState(null);
  const previousStationRef = useRef(null);
  const animationTimeoutRef = useRef(null);

  // 시간 정보 애니메이션 상태 (방송국과 함께 애니메이션)
  const [timeAnimationState, setTimeAnimationState] = useState('idle');
  const [displayTimeInfo, setDisplayTimeInfo] = useState({ currentTime: '--:--', bufferedTime: '--:--' });

  const audioRef = useRef(null);
  const MBC_PROXY = 'https://broken-field-5aad.qwer999.workers.dev/?url=';

  // Drag and drop sensor configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Press delay configuration
      activationConstraint: {
        distance: 8, // 8px 이동 후 드래그 시작
      },
    }),
    useSensor(TouchSensor, {
      // Touch sensor configuration for mobile
      activationConstraint: {
        delay: 0, // 500ms 동안 터치 유지 후 드래그 시작 (더 길게)
        tolerance: 8, // 8px 이내의 움직임은 허용 (더 넉넉하게)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Drag start handler
  const handleDragStart = (event) => {
    const id = event.active.id;
    setActiveId(id);

    // 모바일에서 드래그 중 스크롤 방지
    document.body.classList.add('no-scroll');

    // Find the station being dragged
    const draggedStation = [...stations, ...excludedStations].find((s) => s.id === id);
    if (draggedStation) {
      setActiveStation(draggedStation);
    }
  };

  // Drag cancel handler
  const handleDragCancel = () => {
    setActiveId(null);
    setActiveStation(null);
    // 스크롤 복원
    document.body.classList.remove('no-scroll');
  };

  // Drag and drop end handler
  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveStation(null);

    // 스크롤 복원
    document.body.classList.remove('no-scroll');

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Do nothing if it's the same item
    if (activeId === overId) return;

    // 같은 목록 내에서 순서 변경 (정확한 인덱스 계산)
    if (stations.some((s) => s.id === activeId) && stations.some((s) => s.id === overId)) {
      setStations((items) => {
        const oldIndex = items.findIndex((item) => item.id === activeId);
        const newIndex = items.findIndex((item) => item.id === overId);

        // 정확한 드롭 위치 계산
        const adjustedNewIndex = oldIndex < newIndex ? newIndex : newIndex;

        const newArray = arrayMove(items, oldIndex, adjustedNewIndex);
        localStorage.setItem('radioStations', JSON.stringify(newArray));
        return newArray;
      });
      return;
    }

    // Dropped to the exclusion area
    if (overId === 'excluded-drop-area' || overId === 'station-exclude-drop-area') {
      const stationToMove = stations.find((s) => s.id === activeId);

      // If the currently selected station is moved to exclusion list, select another station
      if (selected?.id === stationToMove.id && stations.length > 1) {
        const nextStation = stations.find((s) => s.id !== stationToMove.id);
        setSelected(nextStation);
        fetchStream(nextStation);
      }

      setStations((items) => {
        const newItems = items.filter((item) => item.id !== activeId);
        localStorage.setItem('radioStations', JSON.stringify(newItems));
        return newItems;
      });

      setExcludedStations((items) => {
        const newItems = [...items, stationToMove];
        localStorage.setItem('excludedStations', JSON.stringify(newItems));
        return newItems;
      });

      return;
    }

    // Do nothing if it's the same item
    if (activeId === overId) return;

    const isActiveInStations = stations.some((s) => s.id === activeId);
    const isActiveInExcluded = excludedStations.some((s) => s.id === activeId);
    const isOverInStations = stations.some((s) => s.id === overId);
    const isOverInExcluded = excludedStations.some((s) => s.id === overId);

    // Move within the same list
    if (isActiveInStations && isOverInStations) {
      setStations((items) => {
        const oldIndex = items.findIndex((item) => item.id === activeId);
        const newIndex = items.findIndex((item) => item.id === overId);
        const newArray = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('radioStations', JSON.stringify(newArray));
        return newArray;
      });
    } else if (isActiveInExcluded && isOverInExcluded) {
      setExcludedStations((items) => {
        const oldIndex = items.findIndex((item) => item.id === activeId);
        const newIndex = items.findIndex((item) => item.id === overId);
        const newArray = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('excludedStations', JSON.stringify(newArray));
        return newArray;
      });
    }
    // Move from playlist to exclusion list
    else if (isActiveInStations && isOverInExcluded) {
      const stationToMove = stations.find((s) => s.id === activeId);

      // If the currently selected station is moved to exclusion list, select another station
      if (selected?.id === stationToMove.id && stations.length > 1) {
        const nextStation = stations.find((s) => s.id !== stationToMove.id);
        setSelected(nextStation);
        fetchStream(nextStation);
      }

      setStations((items) => {
        const newItems = items.filter((item) => item.id !== activeId);
        localStorage.setItem('radioStations', JSON.stringify(newItems));
        return newItems;
      });

      setExcludedStations((items) => {
        const targetIndex = items.findIndex((item) => item.id === overId);
        const newIndex = targetIndex >= 0 ? targetIndex : items.length;
        const newItems = [...items];
        newItems.splice(newIndex, 0, stationToMove);
        localStorage.setItem('excludedStations', JSON.stringify(newItems));
        return newItems;
      });
    }
    // Move from exclusion list to playlist
    else if (isActiveInExcluded && isOverInStations) {
      const stationToMove = excludedStations.find((s) => s.id === activeId);

      setExcludedStations((items) => {
        const newItems = items.filter((item) => item.id !== activeId);
        localStorage.setItem('excludedStations', JSON.stringify(newItems));
        return newItems;
      });

      setStations((items) => {
        const targetIndex = items.findIndex((item) => item.id === overId);
        const newIndex = targetIndex >= 0 ? targetIndex : items.length;
        const newItems = [...items];
        newItems.splice(newIndex, 0, stationToMove);
        localStorage.setItem('radioStations', JSON.stringify(newItems));
        return newItems;
      });
    }
    // Move from exclusion list to station list drop area
    else if (isActiveInExcluded && overId === 'station-list-drop-area') {
      const stationToMove = excludedStations.find((s) => s.id === activeId);

      setExcludedStations((items) => {
        const newItems = items.filter((item) => item.id !== activeId);
        localStorage.setItem('excludedStations', JSON.stringify(newItems));
        return newItems;
      });

      setStations((items) => {
        const newItems = [...items, stationToMove];
        localStorage.setItem('radioStations', JSON.stringify(newItems));
        return newItems;
      });
    }
  };

  // Fetch stream URL
  const fetchStream = async (station) => {
    setLoading(true);
    setError('');
    setNowPlaying(null);
    // 방송국 변경 시 시간 표시가 계속 유지되도록 기존 시간 정보 유지
    // 아래 코드는 제거하여 기존 시간 정보를 계속 표시
    try {
      let url = '';
      let np = null;
      if (station.type === 'kbs') {
        const res = await fetch(station.api);
        const json = await res.json();
        url = json.channel_item?.[0]?.service_url || '';
        // Parse KBS broadcast info (example: title, host, time)
        if (json.channelMaster) {
          np = {
            title: json.channelMaster.pps_kind_label || '',
            host: json.channelMaster.host || '',
            time: json.channelMaster.time || '',
          };
        }
      } else if (station.type === 'mbc') {
        // Request MBC radio through proxy
        const proxyUrl = MBC_PROXY + encodeURIComponent(station.api);
        const res = await fetch(proxyUrl);
        url = await res.text();
        // np = { title: '프로그램명', host: '진행자', time: '방송시간' };
      } else if (station.type === 'sbs') {
        const res = await fetch(station.api);
        url = await res.text();
        // np = { title: '프로그램명', host: '진행자', time: '방송시간' };
      } else if (station.type === 'static') {
        url = station.api;
      }
      setStreamUrl(url);
      setNowPlaying(np);
    } catch (e) {
      setError('스트림 URL을 가져오지 못했습니다.');
      setStreamUrl('');
      setNowPlaying(null);
    }
    setLoading(false);
  };

  // Update stream when initially loading or when selected changes
  useEffect(() => {
    fetchStream(selected);
    // eslint-disable-next-line
  }, [selected]);

  // Previous channel (useCallback)
  const prevChannel = useCallback(() => {
    if (!selected) return;
    const idx = stations.findIndex((s) => s.id === selected.id);
    if (idx === -1) {
      setSelected(stations[0]);
      return;
    }
    const prevIdx = (idx - 1 + stations.length) % stations.length;
    setSelected(stations[prevIdx]);
  }, [stations, selected]);

  // Next channel (useCallback)
  const nextChannel = useCallback(() => {
    if (!selected) return;
    const idx = stations.findIndex((s) => s.id === selected.id);
    if (idx === -1) {
      setSelected(stations[0]);
      return;
    }
    const nextIdx = (idx + 1) % stations.length;
    setSelected(stations[nextIdx]);
  }, [stations, selected]);

  // Media Session API setup (car media button integration)
  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      return;
    }

    // Play/pause handlers
    const handlePlay = () => {
      const audio = document.querySelector('audio');
      if (audio) audio.play();
    };

    const handlePause = () => {
      const audio = document.querySelector('audio');
      if (audio) audio.pause();
    };

    // 미디어 세션 메타데이터 설정 함수
    const updateMediaMetadata = () => {
      if (!selected) return;

      // 방송국 이름과 타입으로 고정
      const displayTitle = selected.name;
      const displayArtist = selected.type.toUpperCase();

      // ID 값을 표시 텍스트로 사용 (한글 깨짐 방지)
      let stationDisplayText = selected.id.toUpperCase();

      // ID가 너무 길면 두 줄로 나누기
      let stationDisplayLines = [stationDisplayText];
      if (stationDisplayText.length > 10) {
        // 적절한 위치에서 줄바꿈
        const midPoint = Math.ceil(stationDisplayText.length / 2);
        stationDisplayLines = [stationDisplayText.slice(0, midPoint), stationDisplayText.slice(midPoint)];
      }

      // 두 줄로 표시할 텍스트 (| 기호로 줄바꿈)
      const formattedText = stationDisplayLines.join('|');

      // 색상 구분 없이 기본 회색 배경 사용
      const bgColor = '333';

      // 고정된 메타데이터로 설정
      navigator.mediaSession.metadata = new MediaMetadata({
        title: displayTitle,
        artist: displayArtist,
        // album 필드 제거
        artwork: [
          { src: `https://placehold.co/96x96/${bgColor}/fff?text=${encodeURIComponent(formattedText)}`, sizes: '96x96', type: 'image/png' },
          { src: `https://placehold.co/128x128/${bgColor}/fff?text=${encodeURIComponent(formattedText)}`, sizes: '128x128', type: 'image/png' },
          { src: `https://placehold.co/192x192/${bgColor}/fff?text=${encodeURIComponent(formattedText)}`, sizes: '192x192', type: 'image/png' },
          { src: `https://placehold.co/256x256/${bgColor}/fff?text=${encodeURIComponent(formattedText)}`, sizes: '256x256', type: 'image/png' },
          { src: `https://placehold.co/384x384/${bgColor}/fff?text=${encodeURIComponent(formattedText)}`, sizes: '384x384', type: 'image/png' },
          { src: `https://placehold.co/512x512/${bgColor}/fff?text=${encodeURIComponent(formattedText)}`, sizes: '512x512', type: 'image/png' },
        ],
      }); // 디버깅용 로그
      console.log('Media session metadata 설정:', {
        title: displayTitle,
        artist: displayArtist,
      });
    };

    // 메타데이터 설정
    updateMediaMetadata();

    // Register media button action handlers
    navigator.mediaSession.setActionHandler('play', handlePlay);
    navigator.mediaSession.setActionHandler('pause', handlePause);
    navigator.mediaSession.setActionHandler('previoustrack', prevChannel);
    navigator.mediaSession.setActionHandler('nexttrack', nextChannel);

    // iOS에서 10초 이동 버튼을 비활성화하기 위해 빈 핸들러 설정
    // 이렇게 하면 시스템은 이 기능을 지원하지 않는다고 인식하고 채널 이동 버튼만 표시함
    navigator.mediaSession.setActionHandler('seekbackward', null);
    navigator.mediaSession.setActionHandler('seekforward', null);

    return () => {
      // Cleanup function: remove handlers
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
    };
  }, [selected, prevChannel, nextChannel]); // nowPlaying과 streamUrl 의존성 제거

  // Auto-play audio when streamUrl changes
  useEffect(() => {
    if (!streamUrl) return;
    const audio = document.querySelector('audio');
    if (audio) {
      audio.play();
    }
  }, [streamUrl]);

  // 방송국 변경 애니메이션 처리
  useEffect(() => {
    // 이전 타이머가 있다면 정리
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    if (selected !== previousStationRef.current) {
      if (previousStationRef.current !== null || displayStation !== null) {
        // 기존 방송국이 있으면 슬라이드 아웃
        setStationAnimationState('slide-out');
        setTimeAnimationState('slide-out'); // 시간도 함께 슬라이드 아웃

        animationTimeoutRef.current = setTimeout(() => {
          // 300ms 후 기존 방송국 제거하고 새 방송국 설정
          setDisplayStation(selected);
          // 시간 초기화 대신 기존 시간 유지 (방송국 변경 시 중간 단계 '--:--' 표시 제거)
          setStationAnimationState('slide-in');
          setTimeAnimationState('slide-in'); // 시간도 함께 슬라이드 인

          animationTimeoutRef.current = setTimeout(() => {
            // 추가 300ms 후 애니메이션 완료
            setStationAnimationState('idle');
            setTimeAnimationState('idle');
            previousStationRef.current = selected;
          }, 300);
        }, 300);
      } else {
        // 처음 방송국 선택 시
        setDisplayStation(selected);
        // 초기 시간은 --:--로 설정 (기본 값)
        setDisplayTimeInfo({ currentTime: '--:--', bufferedTime: '--:--' });
        setStationAnimationState('slide-in');
        setTimeAnimationState('slide-in');
        previousStationRef.current = selected;

        animationTimeoutRef.current = setTimeout(() => {
          setStationAnimationState('idle');
          setTimeAnimationState('idle');
        }, 300);
      }
    }

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [selected]); // 오직 selected만 의존성으로 설정

  // 시간 정보 업데이트 (애니메이션 없이 즉시 업데이트)
  useEffect(() => {
    // 방송국 이동 시 시간 정보 즉시 업데이트 (애니메이션 없이)
    setDisplayTimeInfo(timeInfo);
  }, [timeInfo]);

  // When selecting a station
  const handleSelect = (station) => {
    // If clicking the same channel
    if (selected?.id === station.id) {
      // Find audio element
      const audio = document.querySelector('audio');
      if (audio) {
        // If paused then play, if playing then pause
        if (audio.paused) {
          audio.play();
        } else {
          audio.pause();
        }
      }
    } else {
      // If selecting a different channel, reset playback state
      setIsPlaying(false);
      setIsPaused(false);
      setSelected(station);
      fetchStream(station);
    }
  };

  // Playback state change handler
  const handlePlaybackStateChange = (playing) => {
    setIsPlaying(playing);
    setIsPaused(!playing && streamUrl); // If there's a stream URL and not playing, then it's paused
  };

  // 시간 정보 업데이트 핸들러
  const handleTimeUpdate = (timeData) => {
    setTimeInfo(timeData);
  };

  // Skip backward 10 seconds
  const skipBackward = () => {
    const audio = document.querySelector('audio');
    if (audio) audio.currentTime = Math.max(0, audio.currentTime - 10);
  };

  // Skip forward 10 seconds
  const skipForward = () => {
    const audio = document.querySelector('audio');
    if (audio) audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    // 방송국이 선택되지 않았을 때 첫 번째 방송국 자동 선택
    if (!selected && stations.length > 0) {
      const firstStation = stations[0];
      handleSelect(firstStation);
      return;
    }

    const audio = document.querySelector('audio');
    if (audio) {
      if (audio.paused) {
        audio.play().catch((e) => console.log('재생 실패:', e));
      } else {
        audio.pause();
      }
    }
  };

  // Restore station from exclusion list
  const restoreStation = (station) => {
    setExcludedStations((items) => {
      const newItems = items.filter((item) => item.id !== station.id);
      localStorage.setItem('excludedStations', JSON.stringify(newItems));
      return newItems;
    });

    setStations((items) => {
      const newItems = [...items, station];
      localStorage.setItem('radioStations', JSON.stringify(newItems));
      return newItems;
    });
  };

  // 재생목록 리셋 함수
  const handleResetPlaylist = () => {
    setStations(defaultStations);
    setExcludedStations([]);
    localStorage.setItem('radioStations', JSON.stringify(defaultStations));
    localStorage.setItem('excludedStations', JSON.stringify([]));
    // 첫번째 방송국 선택하여 설정
    setSelected(defaultStations[0]);
    // 선택한 방송국으로 스트림 가져오기
    fetchStream(defaultStations[0]);
    // 시간 정보 초기화 확실하게 설정
    setDisplayTimeInfo({ currentTime: '--:--', bufferedTime: '--:--' });
  };

  // Global access for playlist reset functionality
  useEffect(() => {
    window.resetPlaylist = handleResetPlaylist;

    // 편집 모드 토글을 위한 전역 함수
    window.toggleStationEditMode = (value) => {
      setIsEditMode(value);
    };

    return () => {
      window.resetPlaylist = undefined;
      window.toggleStationEditMode = undefined;
    };
  }, []);

  // ...existing code...
  return (
    <div className="min-h-screen text-white flex flex-col items-center  select-none relative">
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <StationList stations={stations} selectedId={selected?.id} onSelect={handleSelect} isPlaying={isPlaying} isEditMode={isEditMode} />
        <ExcludedList stations={excludedStations} onRestore={restoreStation} isEditMode={isEditMode} />

        <DragOverlay adjustScale={false} zIndex={100}>
          {activeStation ? (
            <StationCard
              station={activeStation}
              selected={selected?.id === activeStation.id}
              excluded={excludedStations.some((s) => s.id === activeStation.id)}
              isDragOverlay={true}
              onClick={() => {}}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <div
        className="fixed left-0 bottom-0 w-full px-6 pt-4  bg-[#000] flex flex-col justify-center z-[9999] transform transition-transform duration-500 ease-out"
        style={{ background: 'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, #000000 80px)' }}
      >
        <div className="flex justify-around p-4 mx-auto border-box px-8 mb-3 gap-4 rounded-full bg-[#2CFFAA] w-[220px] justify transition-all duration-300">
          <img
            src="/radio/icon_prev.png"
            alt="이전 채널"
            className="w-[30px] h-[30px] cursor-pointer transition-all duration-300 active:scale-80 active:rotate-3 z-10 relative opacity-50"
            onClick={prevChannel}
          />
          {isPlaying ? (
            <img
              src="/radio/icon_pause.png"
              alt="일시정지"
              className="w-[30px] h-[30px] cursor-pointer transition-all duration-300 active:scale-80 z-10 relative"
              onClick={togglePlayPause}
            />
          ) : (
            <img
              src="/radio/icon_play.png"
              alt="재생"
              className="w-[30px] h-[30px] cursor-pointer transition-all duration-300 active:scale-80 z-10 relative"
              onClick={togglePlayPause}
            />
          )}
          <img
            src="/radio/icon_next.png"
            alt="다음 채널"
            className="w-[30px] h-[30px] cursor-pointer transition-all duration-300 active:scale-80 active:-rotate-3 z-10 relative opacity-50"
            onClick={nextChannel}
          />
        </div>
        <div className="flex flex-row items-center text-[14px] gap-2 pb-5 transition-opacity duration-300 ">
          <div className="flex flex-col mr-auto justify-start  items-start">
            <div className="mr-auto overflow-hidden flex flex-col">
              <strong
                className={`text-white font-bold transition-colors duration-300 block whitespace-nowrap
                ${
                  stationAnimationState === 'slide-out'
                    ? 'station-slide-out'
                    : stationAnimationState === 'slide-in'
                    ? 'station-slide-in'
                    : 'station-idle'
                }`}
              >
                {displayStation ? displayStation.name : '방송국을 선택하세요'}
              </strong>
            </div>
            <div className="mr-2 overflow-hidden text-[12px]">
              <div
                className={`text-gray-500 block whitespace-nowrap 
                ${
                  timeAnimationState === 'slide-out'
                    ? 'station-slide-out'
                    : timeAnimationState === 'slide-in'
                    ? 'time-fade-in' // 시간 전용 페이드인 애니메이션 사용
                    : 'station-idle'
                }`}
                style={{ fontFamily: 'Lato, sans-serif' }}
              >
                <span style={{ fontFamily: 'Lato, sans-serif' }} className="transition-colors duration-300 leading-tight tabular-nums">
                  {displayTimeInfo.currentTime}
                </span>{' '}
                /{' '}
                <span style={{ fontFamily: 'Lato, sans-serif' }} className="transition-colors duration-300 leading-tight tabular-nums">
                  {displayTimeInfo.bufferedTime}
                </span>
              </div>
            </div>
          </div>
          <img
            src="/radio/icon_prev_10s.png"
            alt="10초 전"
            className="w-[25px] h-[27px] cursor-pointer transition-all duration-200 active:scale-85 active:brightness-75"
            onClick={skipBackward}
          />
          <img
            src="/radio/icon_next_10s.png"
            alt="10초 후"
            className="w-[25px] h-[27px] cursor-pointer transition-all duration-200 active:scale-85 active:brightness-75"
            onClick={skipForward}
          />
        </div>
      </div>

      {/* 숨겨진 오디오 플레이어 - 실제 오디오 재생만 담당 */}
      <div style={{ display: 'none' }}>
        <AudioPlayer src={streamUrl} nowPlaying={nowPlaying} onPlaybackStateChange={handlePlaybackStateChange} onTimeUpdate={handleTimeUpdate} />
      </div>

      {/* 플레이리스트 리셋 버튼 */}
      <ResetPlaylistButton />
    </div>
  );
}

export default App;
