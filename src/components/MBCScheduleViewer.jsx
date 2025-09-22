// MBC 편성표 보기 컴포넌트
import React, { useState, useEffect } from 'react';
import {
  fetchMBCSchedule,
  getTodayDateString,
  formatTime,
  formatDateDisplay,
  MBC_CHANNEL_TYPES,
  getMBCDailySchedule,
  getChannelName,
} from '../assets/radioSchedule';

function MBCScheduleViewer({ stationId, onClose, initialChannelType }) {
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(getTodayDateString());
  const [channelType, setChannelType] = useState(initialChannelType || (stationId === 'mbc_fm4u' ? MBC_CHANNEL_TYPES.FM4U : MBC_CHANNEL_TYPES.FM));

  useEffect(() => {
    async function loadSchedule() {
      setLoading(true);
      try {
        const result = await getMBCDailySchedule(date, channelType);

        if (result.error) {
          setError(result.error);
          setScheduleData([]);
        } else {
          // 현재 날짜의 프로그램만 필터링
          const programs = [];

          // 모든 날짜의 프로그램을 하나의 배열로 합치기
          Object.values(result.programsByDate).forEach((datePrograms) => {
            programs.push(...datePrograms.map((program) => program.rawData));
          });

          setScheduleData(programs);
          setError(null);
        }
      } catch (err) {
        setError('편성표를 불러오는데 실패했습니다.');
        console.error('Schedule loading error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSchedule();
  }, [date, channelType]);

  // 날짜 변경 함수
  const changeDate = (offset) => {
    const currentDate = new Date(date.substring(0, 4), parseInt(date.substring(4, 6)) - 1, date.substring(6, 8));

    currentDate.setDate(currentDate.getDate() + offset);

    const newYear = currentDate.getFullYear();
    const newMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
    const newDay = String(currentDate.getDate()).padStart(2, '0');

    setDate(`${newYear}${newMonth}${newDay}`);
  };

  // 현재 시간에 해당하는 프로그램 강조
  const isCurrentProgram = (program) => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const currentTime = hours + minutes;

    return currentTime >= program.StartTime && currentTime < program.EndTime;
  };

  // 채널 변경 함수
  const switchChannel = () => {
    // FM <-> FM4U 토글
    setChannelType((prev) => (prev === MBC_CHANNEL_TYPES.FM ? MBC_CHANNEL_TYPES.FM4U : MBC_CHANNEL_TYPES.FM));
  };

  // 시간 형식 변경 (HHMM -> HH:MM)
  const formatTimeDisplay = (timeString) => {
    if (!timeString || timeString.length !== 4) return timeString;
    return `${timeString.substring(0, 2)}:${timeString.substring(2, 4)}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">{getChannelName(channelType)} 편성표</h2>
          <div className="flex items-center">
            <button onClick={switchChannel} className="text-blue-400 hover:text-blue-300 mr-4 text-sm bg-blue-900 bg-opacity-30 px-2 py-1 rounded">
              {channelType === MBC_CHANNEL_TYPES.FM ? 'FM4U로 전환' : '표준FM으로 전환'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              닫기
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center p-3 bg-gray-800">
          <button onClick={() => changeDate(-1)} className="px-3 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600">
            이전 날짜
          </button>

          <div className="text-white font-medium">{formatDateDisplay(date)}</div>

          <button onClick={() => changeDate(1)} className="px-3 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600">
            다음 날짜
          </button>
        </div>

        <div className="overflow-y-auto flex-1 hide-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-white">로딩 중...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-red-400">{error}</div>
            </div>
          ) : (
            <div className="p-2">
              {scheduleData.map((program, index) => (
                <div
                  key={`${program.BroadcastID || index}-${index}`}
                  className={`p-3 mb-2 rounded-lg ${isCurrentProgram(program) ? 'bg-blue-900 border border-blue-700' : 'bg-gray-800'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-lg font-medium text-white">{program.Title}</div>
                      {program.SubTitle && program.SubTitle !== program.Title && <div className="text-sm text-gray-400">{program.SubTitle}</div>}
                      {program.Players && <div className="text-xs text-gray-500 mt-1">진행: {program.Players}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">
                        {formatTimeDisplay(program.StartTime)} - {formatTimeDisplay(program.EndTime)}
                      </div>
                      <div className="text-xs text-gray-400">{program.RunningTime}분</div>
                    </div>
                  </div>

                  {program.Photo && (
                    <div className="mt-2">
                      <img src={program.Photo} alt={program.Title} className="w-16 h-16 object-cover rounded" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MBCScheduleViewer;
