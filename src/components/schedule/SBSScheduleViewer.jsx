// SBS 편성표 보기 컴포넌트
import React, { useState, useEffect } from 'react';
import { getTodayDateString } from '../../utils/dateUtils';
import { isCurrentProgram } from '../../utils/scheduleUtils';
import ScheduleModal from './ScheduleModal';
import ProgramItem from './ProgramItem';
import { getSBSDailySchedule } from '../../services/api/sbsService';
import { SBS_CHANNEL_TYPES, getChannelName } from '../../constants/channelTypes';

/**
 * SBS 라디오 편성표를 표시하는 컴포넌트
 */
function SBSScheduleViewer({ stationId, onClose }) {
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(getTodayDateString());

  // 스테이션 ID에 따라 적절한 채널 타입 설정
  const [channelType, setChannelType] = useState(() => {
    switch (stationId) {
      case 'sbs_powerfm':
        return SBS_CHANNEL_TYPES.POWER_FM;
      case 'sbs_lovefm':
        return SBS_CHANNEL_TYPES.LOVE_FM;
      case 'sbs_gorillafm':
        return SBS_CHANNEL_TYPES.GORILLA_M;
      default:
        return SBS_CHANNEL_TYPES.POWER_FM;
    }
  });

  useEffect(() => {
    async function loadSchedule() {
      setLoading(true);
      try {
        const result = await getSBSDailySchedule(date, channelType);

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
    <div className="flex space-x-2 flex-wrap">
      <button
        onClick={() => setChannelType(SBS_CHANNEL_TYPES.POWER_FM)}
        className={`px-3 py-1 rounded ${
          channelType === SBS_CHANNEL_TYPES.POWER_FM ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        파워FM
      </button>
      <button
        onClick={() => setChannelType(SBS_CHANNEL_TYPES.LOVE_FM)}
        className={`px-3 py-1 rounded ${
          channelType === SBS_CHANNEL_TYPES.LOVE_FM ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        러브FM
      </button>
      <button
        onClick={() => setChannelType(SBS_CHANNEL_TYPES.GORILLA_M)}
        className={`px-3 py-1 rounded ${
          channelType === SBS_CHANNEL_TYPES.GORILLA_M ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        고릴라M
      </button>
    </div>
  );

  // 현재 시간 기준으로 방송 중인 프로그램인지 확인
  const checkIsCurrentProgram = (program) => {
    return isCurrentProgram(program, date);
  };

  // 채널 이름 가져오기
  const channelName = (() => {
    switch (channelType) {
      case SBS_CHANNEL_TYPES.POWER_FM:
        return 'SBS 파워FM';
      case SBS_CHANNEL_TYPES.LOVE_FM:
        return 'SBS 러브FM';
      case SBS_CHANNEL_TYPES.GORILLA_M:
        return 'SBS 고릴라M';
      default:
        return 'SBS 라디오';
    }
  })();

  return (
    <ScheduleModal
      title={`${channelName} 편성표`}
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
              description={program.description}
              isCurrentProgram={checkIsCurrentProgram(program)}
            />
          ))
        )}
      </div>
    </ScheduleModal>
  );
}

export default SBSScheduleViewer;
