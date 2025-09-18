import { useState, useEffect } from 'react';

export default function ResetPlaylistButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // 키보드 단축키로 토글 (Ctrl + Shift + R)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        setIsVisible(!isVisible);
      }

      // 편집 모드 토글 (Ctrl + Shift + E)
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        toggleEditMode();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible, isEditing]);

  // 편집 모드 토글 함수
  const toggleEditMode = () => {
    // 편집 모드 상태를 전역으로 공유
    if (window.toggleStationEditMode) {
      window.toggleStationEditMode(!isEditing);
    }
    setIsEditing(!isEditing);
  };

  if (!isVisible) {
    return (
      <div className="fixed top-4 right-4 flex space-x-2">
        <div className="bg-gray-800 text-white opacity-60 p-2 rounded cursor-pointer text-xs" onClick={() => setIsVisible(true)}>
          관리
        </div>
        <div
          className={`${
            isEditing ? 'bg-blue-600' : 'bg-gray-800'
          } text-white opacity-60 p-2 rounded cursor-pointer text-xs transition-colors duration-300`}
          onClick={toggleEditMode}
        >
          {isEditing ? '완료' : '편집'}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg text-xs max-w-xs z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">플레이리스트 관리</h3>
        <button onClick={() => setIsVisible(false)} className="text-red-400 hover:text-red-300">
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <div className="mt-3 text-gray-400">Press Ctrl+Shift+R to toggle</div>

        <div className="flex justify-between items-center mt-2">
          <span>편집 모드</span>
          <button
            onClick={toggleEditMode}
            className={`px-3 py-1 ${isEditing ? 'bg-blue-600' : 'bg-gray-700'} rounded transition-colors duration-200`}
          >
            {isEditing ? '완료' : '편집'}
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-700">
          <button
            onClick={() => window.resetPlaylist && window.resetPlaylist()}
            className="w-full py-2 bg-red-700 hover:bg-red-600 rounded text-white font-medium transition-colors"
          >
            재생목록 리셋
          </button>
        </div>
      </div>
    </div>
  );
}
