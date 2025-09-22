// KBS 편성표 보기 컴포넌트
import React, { useState, useEffect } from 'react';
import { getTodayDateString } from '../../utils/dateUtils';
import { isCurrentProgram } from '../../utils/scheduleUtils';
import ScheduleModal from './ScheduleModal';
import ProgramItem from './ProgramItem';
import { getKBSDailySchedule } from '../../services/api/kbsService';
import { getChannelName } from '../../constants/channelTypes';

/**
 * KBS 라디오 편성표를 표시하는 컴포넌트
 */
function KBSScheduleViewer({ stationId, onClose }) {
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(getTodayDateString());

  // 채널 코드는 stationId에서 추출
  const channelCode = stationId.replace('kbs', '');

  useEffect(() => {
    async function loadSchedule() {
      setLoading(true);
      try {
        const result = await getKBSDailySchedule(date, channelCode);

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
  }, [date, channelCode, stationId]);

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

  // 현재 시간 기준으로 방송 중인 프로그램인지 확인
  const checkIsCurrentProgram = (program) => {
    return isCurrentProgram(program, date);
  };

  // 채널 이름 가져오기
  const channelName = getChannelName('kbs', stationId);

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

export default KBSScheduleViewer;
