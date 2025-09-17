// 방송국 카드 컴포넌트
import React, { useState, useEffect } from 'react';

const StationCard = React.memo(function StationCard({
  station,
  selected,
  excluded,
  onClick,
  isDragOverlay = false,
  dragHandleProps = {},
  isPlaying = false,
}) {
  // fade 효과를 위한 상태
  const [opacity, setOpacity] = useState(0);

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
      className={`flex flex-row w-full text-left py-[4px] px-[30px] cursor-pointer transition-all duration-150 items-center text-[24px]
        ${excluded ? ' text-gray-400 ' : selected ? ' border-blue-500' : 'opacity-45 !text-[20px] border-gray-700'}
        ${isDragOverlay ? 'bg-black text-white opacity-100 border-blue-500' : ''}`}
      onClick={onClick}
      style={{ touchAction: 'auto' }} // 일반 영역은 스크롤 허용
    >
      <span
        className={`w-8 h-8 mr-[10px] ${
          isDragOverlay ? 'bg-gray-700' : 'bg-gray-700'
        } flex items-center justify-center drag-handle cursor-grab active:cursor-grabbing`}
        style={{ touchAction: 'none' }} // 드래그 핸들만 터치 제한
        {...dragHandleProps}
      >
        ≡
      </span>
      <span className="font-medium select-none">{station.name}</span>
      {selected && (
        <div className="ml-2 flex items-center">
          <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-gray-900 relative">
            {/* 항상 표시되는 선택 표시 (원형) */}
            <div className="absolute inset-0 rounded-full bg-gray-500 opacity-0" style={{ transform: 'scale(0.8)' }} />

            {/* catjam GIF - fade 효과 적용 */}
            <img
              src="/radio/catjam.gif"
              alt="Now Playing"
              className="w-7 h-7 object-cover transition-opacity duration-500"
              style={{ opacity: opacity }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default StationCard;
