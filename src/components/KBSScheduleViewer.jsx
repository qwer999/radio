// KBS 편성표 보기 컴포넌트
import React, { useState, useEffect } from 'react';
import {
  fetchKBSSchedule,
  getTodayDateString,
  formatTimeKBS,
  formatDateDisplay,
  KBS_CHANNEL_TYPES,
  getKBSDailySchedule,
  getKBSChannelName,
} from '../assets/radioSchedule';

function KBSScheduleViewer({ stationId, onClose, initialChannelCode }) {
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(getTodayDateString());

  // 방송국 ID에 따라 채널 코드 매핑
  const getChannelCodeFromStationId = (id) => {
    const channelCodeMap = {
      kbs2: KBS_CHANNEL_TYPES.HAPPY_FM, // Happy FM
      kbs2fm: KBS_CHANNEL_TYPES.COOL_FM, // Cool FM
      kbs1: KBS_CHANNEL_TYPES.RADIO_1, // 1라디오
      kbs3: KBS_CHANNEL_TYPES.RADIO_3, // 3라디오
      kbs1fm: KBS_CHANNEL_TYPES.CLASSIC_FM, // Classic FM
    };

    return channelCodeMap[id] || KBS_CHANNEL_TYPES.HAPPY_FM;
  };

  const [channelCode, setChannelCode] = useState(initialChannelCode || getChannelCodeFromStationId(stationId));

  useEffect(() => {
    async function loadSchedule() {
      setLoading(true);
      try {
        const result = await getKBSDailySchedule(channelCode, date);

        if (result.error) {
          setError(result.error);
          setScheduleData([]);
        } else {
          setScheduleData(result.programs || []);
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
  }, [date, channelCode]);

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
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const currentTime = hours + minutes + seconds;

    const startTime = program.rawData.program_planned_start_time;
    const endTime = program.rawData.program_planned_end_time;

    return currentTime >= startTime && currentTime < endTime;
  };

  // 채널 변경 함수
  const switchChannel = (newChannelCode) => {
    setChannelCode(newChannelCode);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">{getKBSChannelName(channelCode)} 편성표</h2>
          <div className="flex items-center">
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              닫기
            </button>
          </div>
        </div>

        {/* 채널 선택 탭 */}
        <div className="flex justify-between items-center p-2 bg-gray-800">
          <button
            onClick={() => switchChannel(KBS_CHANNEL_TYPES.HAPPY_FM)}
            className={`px-3 py-1 rounded text-sm ${
              channelCode === KBS_CHANNEL_TYPES.HAPPY_FM ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            해피FM
          </button>
          <button
            onClick={() => switchChannel(KBS_CHANNEL_TYPES.COOL_FM)}
            className={`px-3 py-1 rounded text-sm ${
              channelCode === KBS_CHANNEL_TYPES.COOL_FM ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            쿨FM
          </button>
          <button
            onClick={() => switchChannel(KBS_CHANNEL_TYPES.RADIO_1)}
            className={`px-3 py-1 rounded text-sm ${
              channelCode === KBS_CHANNEL_TYPES.RADIO_1 ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            1라디오
          </button>
          <button
            onClick={() => switchChannel(KBS_CHANNEL_TYPES.CLASSIC_FM)}
            className={`px-3 py-1 rounded text-sm ${
              channelCode === KBS_CHANNEL_TYPES.CLASSIC_FM ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            클래식FM
          </button>
        </div>

        {/* 날짜 선택 */}
        <div className="flex justify-between items-center p-3 bg-gray-800 border-t border-gray-700">
          <button onClick={() => changeDate(-1)} className="px-3 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600">
            이전 날짜
          </button>

          <div className="text-white font-medium">{formatDateDisplay(date)}</div>

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
              {scheduleData.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                  <div className="text-gray-400">편성표 데이터가 없습니다.</div>
                </div>
              ) : (
                scheduleData.map((program, index) => (
                  <div
                    key={`${program.id || index}-${index}`}
                    className={`p-3 mb-2 rounded-lg ${isCurrentProgram(program) ? 'bg-blue-900 border border-blue-700' : 'bg-gray-800'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-lg font-medium text-white">{program.title}</div>
                        {program.subtitle && program.subtitle !== program.title && <div className="text-sm text-gray-400">{program.subtitle}</div>}
                        {program.players && <div className="text-xs text-gray-500 mt-1">진행: {program.players}</div>}
                        {program.producer && <div className="text-xs text-gray-500">제작: {program.producer}</div>}
                      </div>
                      <div className="text-right">
                        <div className="text-white font-medium">
                          {program.startTime} - {program.endTime}
                        </div>
                        <div className="text-xs text-gray-400">{program.runningTime}분</div>
                      </div>
                    </div>

                    {program.description && <div className="mt-2 text-xs text-gray-400 line-clamp-2">{program.description}</div>}

                    {program.imageUrl && (
                      <div className="mt-2">
                        <img src={program.imageUrl} alt={program.title} className="w-16 h-16 object-cover rounded" />
                      </div>
                    )}

                    {program.homepageUrl && (
                      <div className="mt-2">
                        <a href={program.homepageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline">
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

export default KBSScheduleViewer;
