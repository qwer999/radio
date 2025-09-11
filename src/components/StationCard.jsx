// 방송국 카드 컴포넌트
import React from 'react';

const StationCard = React.memo(function StationCard({ station, selected, excluded, onClick, isDragOverlay = false, dragHandleProps = {} }) {
  return (
    <div
      className={`flex flex-row w-full text-left py-[4px] cursor-pointer transition-all duration-150
        ${excluded ? 'bg-gray-700 text-gray-400' : selected ? 'bg-blue-900 border-blue-500' : 'bg-gray-800 border-gray-700 hover:bg-gray-700'}
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
    </div>
  );
});

export default StationCard;
