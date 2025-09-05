import { useState, useEffect, useRef } from 'react';
import { radioStations as defaultStations } from './assets/radioStations';
import AudioPlayer from './AudioPlayer';
import './App.css';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 빈 드롭 영역 컴포넌트
const DroppableArea = ({ id }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  // 드래그 중일 때 스타일 변경
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

// 방송국 항목의 Sortable 컴포넌트
const SortableItem = ({ station, isSelected, isPlaying, isPaused, onSelect, isExcluded = false }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: station.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // 드래그 중일 때 z-index 높임
    zIndex: isDragging ? 50 : 'auto',
    // 드래그 시 약간의 회전 효과 추가
    ...(isDragging ? { rotate: '1deg' } : {}),
  };

  // 재생 상태에 따른 이모지 표시
  let statusEmoji = '';
  if (isSelected) {
    if (isPlaying) {
      statusEmoji = '🔊'; // 재생 중 이모지
    } else if (isPaused) {
      statusEmoji = '⏸️'; // 일시정지 이모지
    }
  }

  // 제외 목록은 배경색과 클래스를 다르게 표시
  const bgClass = isExcluded ? 'bg-gray-700 hover:bg-gray-600' : 'hover:bg-gray-800';

  // 선택된 항목 및 드래그 중인 항목 스타일 설정
  const selectedClass = isSelected && !isExcluded ? 'bg-gray-800' : '';
  const draggingClass = isDragging ? 'bg-blue-900 shadow-lg opacity-90' : '';

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`py-3 px-2 flex justify-between items-center cursor-pointer ${bgClass} ${selectedClass} ${draggingClass} select-none`}
      onClick={() => !isExcluded && onSelect(station)}
    >
      <div className="flex items-center select-none">
        {/* 드래그 핸들만 드래그 가능하도록 처리 */}
        <span
          className={`mr-2 w-8 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing rounded touch-manipulation select-none
            ${isDragging ? '!bg-blue-600' : '!bg-gray-700 hover:!bg-gray-600'}`}
          title="드래그하여 순서 변경"
          {...attributes}
          {...listeners}
          style={{
            padding: '10px',
            touchAction: 'none', // 터치 스크롤 방지
          }}
        >
          ≡
        </span>
        <span className={`font-medium select-none ${isExcluded ? 'text-gray-400' : ''}`}>{station.name}</span>
        {statusEmoji && <span className="ml-2 select-none">{statusEmoji}</span>}
      </div>
      <span className="text-xs text-gray-400 select-none">{station.type.toUpperCase()}</span>
    </li>
  );
};

function App() {
  // ...existing code...
}

export default App;
