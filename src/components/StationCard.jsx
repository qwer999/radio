// 방송국 카드 컴포넌트
import React from 'react';

const StationCard = React.memo(function StationCard({ station, selected, excluded, onClick, isDragOverlay = false, dragHandleProps = {} }) {
  return (
    <div
      className={`flex flex-row w-full text-left py-[4px] cursor-pointer transition-all duration-150 items-center text-[24px]
        ${excluded ? ' text-gray-400 ' : selected ? ' border-blue-500' : 'opacity-45 !text-[20px] border-gray-700'}
        ${isDragOverlay ? 'bg-white text-black border-blue-500' : ''}`}
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
          <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-gray-900">
            <img src="/radio/catjam.gif" alt="Now Playing" className="w-7 h-7 object-cover" />
          </div>
        </div>
      )}
    </div>
  );
});

export default StationCard;
