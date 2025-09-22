// 프로그램 정보 컴포넌트
import React from 'react';
import PropTypes from 'prop-types';

/**
 * 방송국 카드 내에 표시되는 현재 방송 프로그램 정보 컴포넌트
 */
function ProgramInfo({ program, onScheduleClick }) {
  if (!program) return null;

  return (
    <div className="flex flex-col ml-2 text-xs text-gray-400 max-w-[50%] overflow-hidden">
      <div className="flex items-center">
        <span className="truncate">{program.title}</span>
        <button onClick={onScheduleClick} className="ml-1 text-[10px] text-blue-400 hover:text-blue-300 bg-blue-900 bg-opacity-30 px-1 rounded">
          편성표
        </button>
      </div>
      <span className="text-[10px] text-gray-500">
        {program.startTime} - {program.endTime}
      </span>
    </div>
  );
}

ProgramInfo.propTypes = {
  program: PropTypes.shape({
    title: PropTypes.string.isRequired,
    startTime: PropTypes.string.isRequired,
    endTime: PropTypes.string.isRequired,
  }),
  onScheduleClick: PropTypes.func.isRequired,
};

export default ProgramInfo;
