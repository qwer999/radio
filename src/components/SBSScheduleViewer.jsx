// SBS 편성표 보기 컴포넌트
import React, { useState, useEffect } from 'react';
import {
  fetchSBSSchedule,
  getTodayDateString,
  formatDateDisplay,
  SBS_CHANNEL_TYPES,
  getSBSDailySchedule,
  getSBSChannelName,
} from '../assets/radioSchedule';

function SBSScheduleViewer({ stationId, onClose, initialChannelType }) {
  const [scheduleData, setScheduleData] = useState({ programs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(null); // 현재 날짜 사용

  // 방송국 ID에 따라 채널 타입 매핑
  const getChannelTypeFromStationId = (id) => {
    const channelTypeMap = {
      sbs_powerfm: SBS_CHANNEL_TYPES.POWER_FM,
      sbs_lovefm: SBS_CHANNEL_TYPES.LOVE_FM,
      sbs_gorilla: SBS_CHANNEL_TYPES.GORILLA_M,
    };

    return channelTypeMap[id] || SBS_CHANNEL_TYPES.POWER_FM;
  };

  const [channelType, setChannelType] = useState(initialChannelType || getChannelTypeFromStationId(stationId));

  useEffect(() => {
    async function loadSchedule() {
      setLoading(true);
      try {
        const result = await getSBSDailySchedule(channelType, date);

        if (result.error) {
          setError(result.error);
          setScheduleData({ programs: [] });
        } else {
          setScheduleData(result);
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

  // 날짜 변경 함수 (오늘, 내일, 어제 등)
  const changeDate = (offset) => {
    // 현재 날짜 또는 선택된 날짜
    const currentDate = date ? new Date(date) : new Date();

    // 날짜 변경
    currentDate.setDate(currentDate.getDate() + offset);

    // 날짜 형식 변환 (YYYY/M/D)
    const newDate = `${currentDate.getFullYear()}/${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
    setDate(newDate);
  };

  // 현재 시간에 해당하는 프로그램 강조
  const isCurrentProgram = (program) => {
    if (!program.start_time || !program.end_time) return false;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // 현재 시간 (분 단위)
    const currentMinutes = hours * 60 + minutes;

    // 프로그램 시작/종료 시간 파싱
    const startTimeParts = program.start_time.split(':');
    const endTimeParts = program.end_time.split(':');

    if (startTimeParts.length < 2 || endTimeParts.length < 2) return false;

    const startMinutes = parseInt(startTimeParts[0]) * 60 + parseInt(startTimeParts[1]);
    const endMinutes = parseInt(endTimeParts[0]) * 60 + parseInt(endTimeParts[1]);

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  };

  // 채널 변경 함수
  const switchChannel = (newChannelType) => {
    setChannelType(newChannelType);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">{getSBSChannelName(channelType)} 편성표</h2>
          <div className="flex items-center">
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              닫기
            </button>
          </div>
        </div>

        {/* 채널 선택 탭 */}
        <div className="flex justify-between items-center p-2 bg-gray-800">
          <button
            onClick={() => switchChannel(SBS_CHANNEL_TYPES.POWER_FM)}
            className={`px-3 py-1 rounded text-sm ${
              channelType === SBS_CHANNEL_TYPES.POWER_FM ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            파워FM
          </button>
          <button
            onClick={() => switchChannel(SBS_CHANNEL_TYPES.LOVE_FM)}
            className={`px-3 py-1 rounded text-sm ${
              channelType === SBS_CHANNEL_TYPES.LOVE_FM ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            러브FM
          </button>
          <button
            onClick={() => switchChannel(SBS_CHANNEL_TYPES.GORILLA_M)}
            className={`px-3 py-1 rounded text-sm ${
              channelType === SBS_CHANNEL_TYPES.GORILLA_M ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            고릴라M
          </button>
        </div>

        {/* 날짜 선택 */}
        <div className="flex justify-between items-center p-3 bg-gray-800 border-t border-gray-700">
          <button onClick={() => changeDate(-1)} className="px-3 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600">
            이전 날짜
          </button>

          <div className="text-white font-medium">{date ? formatDateDisplay(date.replace(/\//g, '')) : '오늘'}</div>

          <button onClick={() => changeDate(1)} className="px-3 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600">
            다음 날짜
          </button>
        </div>

        {/* 편성표 목록 */}
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
              {!scheduleData.programs || scheduleData.programs.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                  <div className="text-gray-400">편성표 데이터가 없습니다.</div>
                </div>
              ) : (
                scheduleData.programs.map((program, index) => (
                  <div
                    key={`${program.programId || index}-${index}`}
                    className={`p-3 mb-2 rounded-lg ${isCurrentProgram(program) ? 'bg-blue-900 border border-blue-700' : 'bg-gray-800'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-lg font-medium text-white">{program.title}</div>
                        {program.programcode && program.programcode !== program.title && (
                          <div className="text-sm text-gray-400">{program.programcode}</div>
                        )}
                        {program.guest && <div className="text-xs text-gray-500 mt-1">진행: {program.guest}</div>}
                      </div>
                      <div className="text-right">
                        <div className="text-white font-medium">
                          {program.start_time} - {program.end_time}
                        </div>
                      </div>
                    </div>

                    {program.description && <div className="mt-2 text-xs text-gray-400 line-clamp-2">{program.description}</div>}

                    {program.program_image && (
                      <div className="mt-2">
                        <img src={program.program_image} alt={program.title} className="w-16 h-16 object-cover rounded" />
                      </div>
                    )}

                    {program.programUrl && (
                      <div className="mt-2">
                        <a href={program.programUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline">
                          프로그램 홈페이지 방문
                        </a>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SBSScheduleViewer;
