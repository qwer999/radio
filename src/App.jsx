import { useState, useEffect, useRef, useCallback } from 'react';
import { radioStations as defaultStations } from './assets/radioStations';
import AudioPlayer from './AudioPlayer';
import './App.css';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

// StationItem component for drag overlay (without sortable functionality)
const StationItem = ({ station, isSelected, isPlaying, isPaused, isExcluded = false }) => {
  let statusEmoji = '';
  if (isSelected) {
    if (isPlaying) {
      statusEmoji = '🔊';
    } else if (isPaused) {
      statusEmoji = '⏸️';
    }
  }

  const bgClass = isExcluded ? 'bg-gray-700' : 'bg-gray-800';

  return (
    <div
      className={`flex flex-col items-center justify-center ${bgClass} select-none rounded-lg p-3 border-2 border-blue-500 shadow-xl`}
      style={{ width: '100%', height: '100%' }}
    >
      <span className="w-8 h-8 flex items-center justify-center rounded bg-gray-700 mb-2">≡</span>
      <span className={`font-medium select-none text-center ${isExcluded ? 'text-gray-400' : ''}`}>{station.name}</span>
      {statusEmoji && <span className="mt-1 select-none">{statusEmoji}</span>}
      <span className="text-xs text-gray-400 mt-1 select-none">{station.type.toUpperCase()}</span>
    </div>
  );
};

// SortableItem component with card style
const SortableItem = ({ station, isSelected, isPlaying, isPaused, onSelect, isExcluded = false }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: station.id,
    transition: {
      duration: 150, // milliseconds
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    // Effects while dragging
    ...(isDragging ? { rotate: '2deg', scale: '1.05' } : {}),
    // Grid item size
    width: '100%',
    height: '100%',
  };

  let statusEmoji = '';
  if (isSelected) {
    if (isPlaying) {
      statusEmoji = '🔊';
    } else if (isPaused) {
      statusEmoji = '⏸️';
    }
  }

  const bgClass = isExcluded ? 'bg-gray-700 hover:bg-gray-600' : 'hover:bg-gray-800';
  const selectedClass = isSelected && !isExcluded ? 'bg-gray-800' : '';
  // Style during drag
  const draggingClass = isDragging ? 'bg-blue-900 shadow-xl opacity-90 border-blue-500' : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col items-center justify-center cursor-pointer ${bgClass} ${selectedClass} ${draggingClass} select-none rounded-lg p-3 m-1 border border-gray-700 bg-red-200`}
      onClick={() => !isExcluded && onSelect(station)}
      {...attributes}
      {...listeners}
    >
      <span className="w-8 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing rounded bg-gray-700 mb-2">≡</span>
      <span className={`font-medium select-none text-center ${isExcluded ? 'text-gray-400' : ''}`}>{station.name}</span>
      {statusEmoji && <span className="mt-1 select-none">{statusEmoji}</span>}
      <span className="text-xs text-gray-400 mt-1 select-none">{station.type.toUpperCase()}</span>
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
        delay: 250, // 250ms delay before dragging starts
        tolerance: 5, // 5px tolerance
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
  };

  // Drag and drop end handler
  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveStation(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Dropped to the exclusion area
    if (overId === 'excluded-drop-area') {
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

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 select-none">
      <h1 className="text-2xl font-bold mb-4">대한민국 인터넷 라디오</h1>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="w-full max-w-md mb-4">
          <h2 className="text-lg font-semibold mb-2 border-b border-gray-700 pb-1">재생 목록</h2>
          <SortableContext items={stations.map((s) => s.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-2">
              {stations.map((station) => (
                <SortableItem
                  key={station.id}
                  station={station}
                  isSelected={selected.id === station.id}
                  isPlaying={selected.id === station.id && isPlaying}
                  isPaused={selected.id === station.id && isPaused}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </SortableContext>
          <div className="text-xs text-gray-400 mt-2 p-2 bg-gray-800 rounded">
            드래그하여 방송국 순서를 변경하거나, 아래 제외 목록으로 이동할 수 있습니다.
          </div>
        </div>
        <div className="w-full max-w-md mb-6">
          <h2 className="text-lg font-semibold mb-2 border-b border-gray-700 pb-1 text-gray-400">제외된 방송국</h2>
          {excludedStations.length > 0 ? (
            <SortableContext items={excludedStations.map((s) => s.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 gap-2">
                {excludedStations.map((station) => (
                  <SortableItem key={station.id} station={station} isSelected={false} isExcluded={true} onSelect={() => restoreStation(station)} />
                ))}
              </div>
            </SortableContext>
          ) : (
            <DroppableArea id="excluded-drop-area" />
          )}
          <div className="text-xs text-gray-400 mt-2 p-2 bg-gray-700 rounded">
            제외된 방송국은 재생되지 않습니다. 위 재생 목록으로 드래그하여 복원할 수 있습니다.
          </div>
        </div>

        <DragOverlay adjustScale={true} zIndex={100}>
          {activeStation ? (
            <StationItem
              station={activeStation}
              isSelected={selected.id === activeStation.id}
              isPlaying={selected.id === activeStation.id && isPlaying}
              isPaused={selected.id === activeStation.id && isPaused}
              isExcluded={excludedStations.some((s) => s.id === activeStation.id)}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
      <div className="w-full max-w-md bg-gray-800 rounded p-4">
        <h2 className="text-lg font-semibold mb-2">{selected.name} 재생</h2>
        <p className="text-xs mb-2">스트림 타입: {selected.type}</p>
        {loading && <p className="text-yellow-400">스트림 정보를 불러오는 중...</p>}
        {error && <p className="text-red-400">{error}</p>}
        {streamUrl && <AudioPlayer src={streamUrl} nowPlaying={nowPlaying} onPlaybackStateChange={handlePlaybackStateChange} />}

        {/* 채널 이동 버튼 (항상 표시) */}
        <div className="flex justify-between mt-3">
          <button onClick={prevChannel} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            이전 채널
          </button>

          {/* 10초 이동 버튼 (스트림 있을 때만 표시) */}
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
  );
}

export default App;
