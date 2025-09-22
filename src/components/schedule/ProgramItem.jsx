// 편성표 프로그램 항목 컴포넌트
import React from 'react';
import PropTypes from 'prop-types';

/**
 * 편성표의 개별 프로그램 항목을 표시하는 컴포넌트
 * 여러 타입의 편성표 뷰어에서 공통으로 사용됨
 */
function ProgramItem({ title, startTime, endTime, description = null, presenters = null, isCurrentProgram = false }) {
  return (
    <div
      className={`p-3 mb-2 rounded ${
        isCurrentProgram ? 'bg-blue-900 bg-opacity-40 border-l-4 border-blue-500' : 'bg-gray-800 hover:bg-gray-700'
      } transition-colors duration-200`}
    >
      <div className="flex justify-between items-start">
        <h3 className={`text-lg font-medium ${isCurrentProgram ? 'text-blue-200' : 'text-white'}`}>{title}</h3>
        <div className="text-sm text-gray-400">
          {startTime} - {endTime}
        </div>
      </div>

      {presenters && <div className="mt-1 text-sm text-gray-400">{Array.isArray(presenters) ? presenters.join(', ') : presenters}</div>}

      {description && <div className="mt-2 text-sm text-gray-400">{description}</div>}

      {isCurrentProgram && <div className="mt-2 text-xs text-blue-400 inline-block px-2 py-1 bg-blue-900 bg-opacity-50 rounded">현재 방송 중</div>}
    </div>
  );
}

ProgramItem.propTypes = {
  title: PropTypes.string.isRequired,
  startTime: PropTypes.string.isRequired,
  endTime: PropTypes.string.isRequired,
  description: PropTypes.string,
  presenters: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
  isCurrentProgram: PropTypes.bool,
};

export default ProgramItem;
