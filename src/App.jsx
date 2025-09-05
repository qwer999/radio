import { useState, useEffect, useRef, useCallback } from 'react';
import StationList from './components/StationList';
import ExcludedList from './components/ExcludedList';
import StationCard from './components/StationCard';
import { radioStations as defaultStations } from './assets/radioStations';
import AudioPlayer from './AudioPlayer';
import './App.css';
import {
  DndContext,
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
  const [selected, setSelected] = useState(stations[0]);
  const [streamUrl, setStreamUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nowPlaying, setNowPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeId, setActiveId] = useState(null); // ID of item being dragged
  const [activeStation, setActiveStation] = useState(null); // Station being dragged
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
      if (selected.id === stationToMove.id && stations.length > 1) {
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
      if (selected.id === stationToMove.id && stations.length > 1) {
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

    // Media session setup
    navigator.mediaSession.metadata = new MediaMetadata({
      title: selected.name,
      artist: '대한민국 인터넷 라디오',
      album: nowPlaying?.title || '라이브 방송',
      artwork: [
        { src: 'https://placehold.co/96x96/333/fff?text=RADIO', sizes: '96x96', type: 'image/png' },
        { src: 'https://placehold.co/128x128/333/fff?text=RADIO', sizes: '128x128', type: 'image/png' },
        { src: 'https://placehold.co/192x192/333/fff?text=RADIO', sizes: '192x192', type: 'image/png' },
        { src: 'https://placehold.co/256x256/333/fff?text=RADIO', sizes: '256x256', type: 'image/png' },
      ],
    });

    // Register media button action handlers
    navigator.mediaSession.setActionHandler('play', handlePlay);
    navigator.mediaSession.setActionHandler('pause', handlePause);
    navigator.mediaSession.setActionHandler('previoustrack', prevChannel);
    navigator.mediaSession.setActionHandler('nexttrack', nextChannel);

    return () => {
      // Cleanup function: remove handlers
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
    };
  }, [selected, nowPlaying, streamUrl, prevChannel, nextChannel]);

  // Auto-play audio when streamUrl changes
  useEffect(() => {
    if (!streamUrl) return;
    const audio = document.querySelector('audio');
    if (audio) {
      audio.play();
    }
  }, [streamUrl]);

  // When selecting a station
  const handleSelect = (station) => {
    // If clicking the same channel
    if (selected.id === station.id) {
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

  // ...existing code...
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 select-none pb-40">
      <h1 className="text-2xl font-bold mb-4">대한민국 인터넷 라디오</h1>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <StationList stations={stations} selectedId={selected?.id} onSelect={handleSelect} />
        <ExcludedList stations={excludedStations} onRestore={restoreStation} />

        <DragOverlay adjustScale={true} zIndex={100}>
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

      {/* 플레이어 영역 - 하단 고정 */}
      <div className="fixed bottom-0 left-0 w-full flex justify-center z-50">
        <div className="w-full max-w-md bg-gray-800 rounded-t-xl p-4 shadow-2xl">
          <h2 className="text-lg font-semibold mb-2">{selected?.name} 재생</h2>
          <p className="text-xs mb-2">스트림 타입: {selected?.type}</p>
          {loading && <p className="text-yellow-400">스트림 정보를 불러오는 중...</p>}
          {error && <p className="text-red-400">{error}</p>}
          {streamUrl && <AudioPlayer src={streamUrl} nowPlaying={nowPlaying} onPlaybackStateChange={handlePlaybackStateChange} />}

          {/* 채널 이동 버튼 */}
          <div className="flex justify-between mt-3">
            <button onClick={prevChannel} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              이전 채널
            </button>
            {streamUrl && (
              <>
                <button onClick={skipBackward} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                  10초 전
                </button>
                <button onClick={skipForward} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                  10초 후
                </button>
              </>
            )}
            <button onClick={nextChannel} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              다음 채널
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
