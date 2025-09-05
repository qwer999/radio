// 제외 목록 컴포넌트
import React from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import StationCard from './StationCard';

function DraggableExcludedStation({ station, onRestore }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: station.id,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  // 드래그 핸들에만 리스너 적용
  const dragHandleProps = {
    ...attributes,
    ...listeners,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <StationCard station={station} selected={false} excluded={true} onClick={() => onRestore(station)} dragHandleProps={dragHandleProps} />
    </div>
  );
}

function DroppableArea({ id }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`text-center text-gray-500 py-4 bg-gray-800 rounded-lg border-2 border-dashed border-gray-700 transition-colors duration-200 ${
        isOver ? 'bg-gray-600' : ''
      }`}
    >
      여기로 방송국을 드래그하여 제외 목록에 추가할 수 있습니다
    </div>
  );
}

function ExcludedList({ stations, onRestore }) {
  return (
    <div className="w-full max-w-md mb-6">
      <h2 className="text-lg font-semibold mb-2 border-b border-gray-700 pb-1 text-gray-400">제외된 방송국</h2>
      <div className="space-y-2">
        {stations.map((station) => (
          <DraggableExcludedStation key={station.id} station={station} onRestore={onRestore} />
        ))}
        <DroppableArea id="excluded-drop-area" />
      </div>
    </div>
  );
}

export default ExcludedList;
