// 방송국 카드 컴포넌트
import React, { useState, useEffect } from 'react';
import MBCScheduleViewer from './MBCScheduleViewer';
import KBSScheduleViewer from './KBSScheduleViewer';
import SBSScheduleViewer from './SBSScheduleViewer';

const StationCard = React.memo(function StationCard({
  station,
  selected,
  excluded,
  onClick,
  isDragOverlay = false,
  dragHandleProps = {},
  isPlaying = false,
  isEditMode = false,
}) {
  // fade 효과를 위한 상태
  const [opacity, setOpacity] = useState(0);
  const [showSchedule, setShowSchedule] = useState(false);

  // 재생 상태가 변경될 때 fade 효과 적용
  useEffect(() => {
    let timeout;
    if (selected) {
      if (isPlaying) {
        // fade in
        setOpacity(0);
        timeout = setTimeout(() => setOpacity(1), 50); // 살짝 딜레이 주고 fade-in
      } else {
        // fade out
        setOpacity(0);
      }
    }
    return () => clearTimeout(timeout);
  }, [isPlaying, selected]);
  return (
    <div
      className={`flex flex-row w-full text-left py-[6px] m-0 px-[8px] md:px-[30px] cursor-pointer !transition-all duration-150 items-center text-[30px] md:text-[34px]
        ${excluded ? '!text-[18px] !py-1 opacity-45' : selected ? '' : 'opacity-45 !text-[21px] md:!text-[30px] !transition-all border-gray-700'}
        ${isDragOverlay ? ' text-white opacity-100' : ''}
        playlist-font`}
      onClick={onClick}
      style={{
        touchAction: 'auto', // 일반 영역은 스크롤 허용
        height: isDragOverlay ? 'auto' : undefined, // 드래그 중 높이 유지
      }}
    >
      <span
        className={`w-8 h-8 mr-[2px] !text-[18px] md:!text-[30px] 
          ${isDragOverlay ? '' : 'bg-none'}
          flex items-center justify-center drag-handle cursor-grab active:cursor-grabbing transition-all duration-300`}
        style={{
          touchAction: 'none',
          willChange: 'opacity, transform',
          opacity: isEditMode ? 0.85 : 0,
          width: isEditMode ? '2rem' : '0',
          marginRight: isEditMode ? '2px' : '0',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }} // 드래그 핸들만 터치 제한
        {...dragHandleProps}
      >
        ≡
      </span>
      <span className=" select-none">{station.name}</span>

      {/* MBC 프로그램 정보 표시 */}
      {station.type === 'mbc' && station.currentProgram && (
        <div className="flex flex-col ml-2 text-xs text-gray-400 max-w-[50%] overflow-hidden">
          <div className="flex items-center">
            <span className="truncate">{station.currentProgram.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation(); // 버블링 방지
                setShowSchedule(true);
              }}
              className="ml-1 text-[10px] text-blue-400 hover:text-blue-300 bg-blue-900 bg-opacity-30 px-1 rounded"
            >
              편성표
            </button>
          </div>
          <span className="text-[10px] text-gray-500">
            {station.currentProgram.startTime} - {station.currentProgram.endTime}
          </span>
        </div>
      )}

      {/* KBS 프로그램 정보 표시 */}
      {station.type === 'kbs' && station.currentProgram && (
        <div className="flex flex-col ml-2 text-xs text-gray-400 max-w-[50%] overflow-hidden">
          <div className="flex items-center">
            <span className="truncate">{station.currentProgram.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation(); // 버블링 방지
                setShowSchedule(true);
              }}
              className="ml-1 text-[10px] text-blue-400 hover:text-blue-300 bg-blue-900 bg-opacity-30 px-1 rounded"
            >
              편성표
            </button>
          </div>
          <span className="text-[10px] text-gray-500">
            {station.currentProgram.startTime} - {station.currentProgram.endTime}
          </span>
        </div>
      )}

      {/* SBS 프로그램 정보 표시 */}
      {station.type === 'sbs' && station.currentProgram && (
        <div className="flex flex-col ml-2 text-xs text-gray-400 max-w-[50%] overflow-hidden">
          <div className="flex items-center">
            <span className="truncate">{station.currentProgram.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation(); // 버블링 방지
                setShowSchedule(true);
              }}
              className="ml-1 text-[10px] text-blue-400 hover:text-blue-300 bg-blue-900 bg-opacity-30 px-1 rounded"
            >
              편성표
            </button>
          </div>
          <span className="text-[10px] text-gray-500">
            {station.currentProgram.startTime} - {station.currentProgram.endTime}
          </span>
        </div>
      )}

      {/* 방송국 타입에 따른 편성표 모달 */}
      {showSchedule && station.type === 'mbc' && <MBCScheduleViewer stationId={station.id} onClose={() => setShowSchedule(false)} />}

      {showSchedule && station.type === 'kbs' && <KBSScheduleViewer stationId={station.id} onClose={() => setShowSchedule(false)} />}

      {showSchedule && station.type === 'sbs' && <SBSScheduleViewer stationId={station.id} onClose={() => setShowSchedule(false)} />}

      {selected && (
        <div className="ml-2 flex items-center">
          <div className="w-8 h-8  md:w-12 md:h-12 rounded-full overflow-hidden flex items-center justify-center bg-gray-900 relative">
            {/* 항상 표시되는 선택 표시 (원형) */}
            <div className="absolute inset-0 rounded-full bg-gray-500 opacity-0" style={{ transform: 'scale(1)' }} />

            {/* catjam GIF - fade 효과 적용 */}
            <img
              src="/radio/catjam.gif"
              alt="Now Playing"
              className="w-full h-full object-cover transition-opacity duration-500"
              style={{ opacity: opacity }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default StationCard;
