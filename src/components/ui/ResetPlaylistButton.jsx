// 플레이리스트 초기화 버튼 컴포넌트
import React, { useState } from 'react';

/**
 * 방송국 목록을 기본 설정으로 초기화하는 버튼 컴포넌트
 */
function ResetPlaylistButton({ onReset }) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleResetClick = () => {
    if (showConfirm) {
      onReset();
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
      // 5초 후 확인 상태 초기화
      setTimeout(() => setShowConfirm(false), 5000);
    }
  };

  return (
    <button
      onClick={handleResetClick}
      className={`px-4 py-2 rounded-lg text-white transition-colors duration-200 ${
        showConfirm ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
      }`}
    >
      {showConfirm ? '정말로 초기화할까요?' : '플레이리스트 초기화'}
    </button>
  );
}

export default ResetPlaylistButton;
