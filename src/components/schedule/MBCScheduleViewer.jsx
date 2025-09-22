// MBC 편성표 보기 컴포넌트
import React, { useState, useEffect } from 'react';
import { getTodayDateString } from '../../utils/dateUtils';
import { isCurrentProgram } from '../../utils/scheduleUtils';
import ScheduleModal from './ScheduleModal';
import ProgramItem from './ProgramItem';
import { getMBCDailySchedule } from '../../services/api/mbcService';
import { MBC_CHANNEL_TYPES } from '../../constants/channelTypes';

/**
 * MBC 라디오 편성표를 표시하는 컴포넌트
 */
function MBCScheduleViewer({ stationId, onClose }) {
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(getTodayDateString());

  // 스테이션 ID에 따라 적절한 채널 타입 설정
  const [channelType, setChannelType] = useState(stationId === 'mbc_fm4u' ? MBC_CHANNEL_TYPES.FM4U : MBC_CHANNEL_TYPES.FM);

  useEffect(() => {
    async function loadSchedule() {
      setLoading(true);
      try {
        const result = await getMBCDailySchedule(date, channelType);

        if (result.error) {
          setError(result.error);
          setScheduleData([]);
        } else {
          // 모든 날짜의 프로그램을 하나의 배열로 합치기
          const programs = [];
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
  }, [date, channelType, stationId]);

  // 날짜 변경 핸들러
  const handlePrevDate = () => {
    const currentDate = new Date(date);
    currentDate.setDate(currentDate.getDate() - 1);
    setDate(currentDate.toISOString().split('T')[0]);
  };

  const handleNextDate = () => {
    const currentDate = new Date(date);
    currentDate.setDate(currentDate.getDate() + 1);
    setDate(currentDate.toISOString().split('T')[0]);
  };

  const handleResetDate = () => {
    setDate(getTodayDateString());
  };

  // 채널 타입 선택기 컴포넌트
  const ChannelTypeSelector = () => (
    <div className="flex space-x-2">
      <button
        onClick={() => setChannelType(MBC_CHANNEL_TYPES.FM4U)}
        className={`px-3 py-1 rounded ${
          channelType === MBC_CHANNEL_TYPES.FM4U ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        FM4U
      </button>
      <button
        onClick={() => setChannelType(MBC_CHANNEL_TYPES.FM)}
        className={`px-3 py-1 rounded ${
          channelType === MBC_CHANNEL_TYPES.FM ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        표준FM
      </button>
    </div>
  );

  // 현재 시간 기준으로 방송 중인 프로그램인지 확인
  const checkIsCurrentProgram = (program) => {
    return isCurrentProgram(program, date);
  };

  return (
    <ScheduleModal
      title={`MBC ${channelType === MBC_CHANNEL_TYPES.FM4U ? 'FM4U' : '표준FM'} 편성표`}
      onClose={onClose}
      loading={loading}
      error={error}
      date={date}
      onPrevDate={handlePrevDate}
      onNextDate={handleNextDate}
      onResetDate={handleResetDate}
      channelTypeSelector={<ChannelTypeSelector />}
    >
      <div className="space-y-1">
        {scheduleData.length === 0 && !loading && !error ? (
          <div className="text-center py-8 text-gray-400">해당 날짜에 편성표 정보가 없습니다.</div>
        ) : (
          scheduleData.map((program, index) => (
            <ProgramItem
              key={`${program.title}-${index}`}
              title={program.title}
              startTime={program.startTime}
              endTime={program.endTime}
              presenters={program.mc}
              isCurrentProgram={checkIsCurrentProgram(program)}
            />
          ))
        )}
      </div>
    </ScheduleModal>
  );
}

export default MBCScheduleViewer;
