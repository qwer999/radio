// 편성표 모달 기본 컴포넌트
import React from 'react';
import PropTypes from 'prop-types';
import { formatDateDisplay } from '../../utils/dateUtils';

/**
 * 방송국 편성표 모달의 기본 컴포넌트
 * 모든 타입의 편성표 뷰어에서 공통으로 사용되는 UI 요소들을 제공
 */
function ScheduleModal({ title, children, onClose, loading, error, date, onPrevDate, onNextDate, onResetDate, channelTypeSelector = null }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4 py-4 md:py-8 overflow-auto">
      <div className="bg-gray-900 w-full max-w-4xl rounded-lg shadow-lg relative max-h-[90vh] flex flex-col">
        {/* 헤더 영역 */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-900 z-10">
          <h2 className="text-xl font-medium text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 날짜 선택 및 채널 선택 영역 */}
        <div className="p-4 bg-gray-800 flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
          <div className="flex items-center space-x-2">
            <button onClick={onPrevDate} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded">
              이전
            </button>
            <div className="text-white font-medium px-2" onClick={onResetDate}>
              {formatDateDisplay(date)}
            </div>
            <button onClick={onNextDate} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded">
              다음
            </button>
            <button onClick={onResetDate} className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded ml-2">
              오늘
            </button>
          </div>

          {/* 채널 선택기 (제공된 경우) */}
          {channelTypeSelector}
        </div>

        {/* 콘텐츠 영역 */}
        <div className="p-4 overflow-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-400">편성표를 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>{error}</p>
              <p className="mt-2 text-sm text-gray-400">잠시 후 다시 시도해주세요.</p>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

ScheduleModal.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
  onClose: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
  date: PropTypes.string.isRequired,
  onPrevDate: PropTypes.func.isRequired,
  onNextDate: PropTypes.func.isRequired,
  onResetDate: PropTypes.func.isRequired,
  channelTypeSelector: PropTypes.node,
};

export default ScheduleModal;
