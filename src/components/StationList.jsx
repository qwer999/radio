// 재생 목록 컴포넌트
import React from 'react';
import StationCard from './StationCard';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ station, selected, onSelect, isPlaying }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: station.id,
    // 드래그 시 변환 동작 수정
    modifiers: [],
  });

  const style = {
    // transform과 CSS 처리 방식 변경
    transform: CSS.Transform.toString({
      ...transform,
      scaleX: 1, // 항상 원래 크기 유지
      scaleY: 1, // 항상 원래 크기 유지
    }),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  // 드래그 핸들에만 리스너 적용
  const dragHandleProps = {
    ...attributes,
    ...listeners,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <StationCard
        station={station}
        selected={selected}
        excluded={false}
        onClick={() => onSelect(station)}
        dragHandleProps={dragHandleProps}
        isPlaying={isPlaying}
      />
    </div>
  );
}

function ExcludeDropArea() {
  const { setNodeRef, isOver } = useDroppable({ id: 'station-exclude-drop-area' });
  return (
    <div
      ref={setNodeRef}
      className={`text-center text-gray-500 py-4 bg-red-800 rounded-lg border-2 border-dashed border-red-700 transition-colors duration-200 ${
        isOver ? 'bg-red-600' : ''
      }`}
    >
      방송국을 여기로 드래그하여 제외 목록에 추가하세요
    </div>
  );
}

function StationList({ stations, selectedId, onSelect, isPlaying }) {
  return (
    <div className="w-full max-w-[600px] mb-4 p-0 pt-8 pb-[100px] playlist-font">
      <SortableContext items={stations.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div>
          {stations.map((station) => (
            <SortableItem
              key={station.id}
              station={station}
              selected={selectedId === station.id}
              onSelect={onSelect}
              isPlaying={selectedId === station.id ? isPlaying : false}
            />
          ))}
          <ExcludeDropArea />
        </div>
      </SortableContext>
    </div>
  );
}

export default StationList;
