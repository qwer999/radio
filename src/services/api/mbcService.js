/**
 * MBC 라디오 관련 API 서비스
 */
import { MBC_CHANNEL_TYPES } from '../../constants/channelTypes';
import { getTodayDateString, formatTime } from '../../utils/dateUtils';

/**
 * MBC 라디오 편성표를 가져오는 함수
 * @param {string} date - 날짜 (YYYYMMDD 형식, 예: 20250923), 생략 시 날짜 파라미터 없이 요청
 * @param {string} channelType - 채널 유형 (MBC_CHANNEL_TYPES 참조)
 * @returns {Promise<Array>} - 편성표 데이터 배열
 */
export async function fetchMBCSchedule(date, channelType = MBC_CHANNEL_TYPES.FM) {
  try {
    // 채널 타입 유효성 검사
    if (!Object.values(MBC_CHANNEL_TYPES).includes(channelType)) {
      throw new Error(`지원하지 않는 MBC 채널 유형입니다: ${channelType}`);
    }

    // 날짜가 제공되면 URL에 포함, 아니면 제외
    let url = `https://control.imbc.com/Schedule/Radio?sType=${channelType}&link=${channelType}`;
    if (date) {
      url += `&sDate=${date}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`MBC 편성표를 가져오는데 실패했습니다: ${response.status}`);
    }

    const scheduleData = await response.json();
    return scheduleData;
  } catch (error) {
    console.error('MBC 편성표 가져오기 오류:', error);
    return [];
  }
}

/**
 * 현재 방송 중인 프로그램 정보 가져오기 (MBC 형식)
 * @param {Array} scheduleData - 편성표 데이터
 * @param {Date} [referenceTime] - 기준 시간 (기본값: 현재 시간)
 * @returns {Object|null} - 현재 방송 중인 프로그램 정보
 */
export function getCurrentMBCProgram(scheduleData, referenceTime = new Date()) {
  if (!scheduleData || !scheduleData.length) return null;

  const hours = referenceTime.getHours().toString().padStart(2, '0');
  const minutes = referenceTime.getMinutes().toString().padStart(2, '0');
  const currentTime = hours + minutes; // 현재 시간 (HHMM 형식)

  // 현재 시간에 방송 중인 프로그램 찾기
  for (const program of scheduleData) {
    // 필수 필드 확인
    if (!program.StartTime || !program.EndTime || !program.Title) {
      continue;
    }

    const startTime = program.StartTime;
    const endTime = program.EndTime;

    if (currentTime >= startTime && currentTime < endTime) {
      return {
        title: program.Title,
        subtitle: program.SubTitle || program.Title,
        startTime: formatTime(startTime),
        endTime: formatTime(endTime),
        imageUrl: program.Photo || '',
        homepageUrl: program.HomepageURL || '',
        players: program.Players || '',
        runningTime: program.RunningTime || '',
        isOnAirNow: program.IsOnAirNow === 'Y',
        day: program.Day || '',
      };
    }
  }

  return null;
}

/**
 * 지정된 날짜의 MBC 채널 전체 편성표 가져오기
 * @param {string} date - 날짜 (YYYYMMDD 형식)
 * @param {string} channelType - 채널 유형 (MBC_CHANNEL_TYPES 참조)
 * @returns {Promise<Object>} - 편성표 데이터와 채널 정보
 */
export async function getMBCDailySchedule(date = getTodayDateString(), channelType = MBC_CHANNEL_TYPES.FM) {
  try {
    const scheduleData = await fetchMBCSchedule(date, channelType);

    // 채널 정보 추출
    const channelInfo = {
      type: channelType,
      name: getMBCChannelName(channelType),
      date: formatDateDisplay(date),
    };

    // 날짜별로 프로그램 정리
    const programsByDate = {};

    scheduleData.forEach((program) => {
      if (!program.BroadDate) return;

      if (!programsByDate[program.BroadDate]) {
        programsByDate[program.BroadDate] = [];
      }

      programsByDate[program.BroadDate].push({
        id: program.BroadcastID,
        title: program.Title,
        subtitle: program.SubTitle,
        startTime: formatTime(program.StartTime),
        endTime: formatTime(program.EndTime),
        imageUrl: program.Photo,
        homepageUrl: program.HomepageURL,
        players: program.Players,
        runningTime: program.RunningTime,
        isOnAirNow: program.IsOnAirNow === 'Y',
        day: program.Day,
        rawData: program, // 원본 데이터도 포함해서 유연하게 활용
      });
    });

    return {
      channelInfo,
      programsByDate,
      rawData: scheduleData, // 원본 데이터 제공
    };
  } catch (error) {
    console.error('MBC 일일 편성표 가져오기 오류:', error);
    return {
      channelInfo: {
        type: channelType,
        name: getMBCChannelName(channelType),
        date: formatDateDisplay(date),
      },
      programsByDate: {},
      error: error.message,
    };
  }
}

/**
 * MBC 방송국 정보에 현재 프로그램 정보 추가
 * @param {Object} station - 방송국 정보
 * @returns {Promise<Object>} - 프로그램 정보가 추가된 방송국 정보
 */
export async function enrichMBCStationWithProgram(station) {
  if (station.type !== 'mbc') return station;

  try {
    // station.mbcChannelType 속성을 확인하여 채널 유형 결정
    // 기본값은 station.id에 따라 다름
    let channelType = MBC_CHANNEL_TYPES.FM;

    if (station.mbcChannelType) {
      // 명시적으로 지정된 채널 타입 사용
      channelType = station.mbcChannelType;
    } else if (station.id === 'mbc_fm4u') {
      channelType = MBC_CHANNEL_TYPES.FM4U;
    } else if (station.id === 'mbc_sfm') {
      channelType = MBC_CHANNEL_TYPES.FM;
    }

    const todayDate = getTodayDateString();
    const scheduleData = await fetchMBCSchedule(todayDate, channelType);
    const currentProgram = getCurrentMBCProgram(scheduleData);

    if (currentProgram) {
      return {
        ...station,
        currentProgram: currentProgram,
        mbcChannelType: channelType, // 채널 타입 정보 추가
      };
    }

    return station;
  } catch (error) {
    console.error('MBC 프로그램 정보 추가 오류:', error);
    return station;
  }
}

/**
 * 모든 MBC 방송국에 프로그램 정보 추가
 * @param {Array} stations - 방송국 목록
 * @returns {Promise<Array>} - 프로그램 정보가 추가된 방송국 목록
 */
export async function enrichAllMBCStations(stations) {
  try {
    // 채널 타입별로 스케줄 데이터 가져오기
    const todayDate = getTodayDateString();
    const fmScheduleData = await fetchMBCSchedule(todayDate, MBC_CHANNEL_TYPES.FM);
    const fm4uScheduleData = await fetchMBCSchedule(todayDate, MBC_CHANNEL_TYPES.FM4U);

    // 채널 타입별 스케줄 데이터 맵
    const scheduleDataMap = {
      [MBC_CHANNEL_TYPES.FM]: fmScheduleData,
      [MBC_CHANNEL_TYPES.FM4U]: fm4uScheduleData,
    };

    const enrichedStations = stations.map((station) => {
      if (station.type !== 'mbc') return station;

      try {
        // 채널 타입 결정
        let channelType = MBC_CHANNEL_TYPES.FM;

        if (station.mbcChannelType) {
          // 명시적으로 지정된 채널 타입 사용
          channelType = station.mbcChannelType;
        } else if (station.id === 'mbc_fm4u') {
          channelType = MBC_CHANNEL_TYPES.FM4U;
        } else if (station.id === 'mbc_sfm') {
          channelType = MBC_CHANNEL_TYPES.FM;
        }

        // 해당 채널의 스케줄 데이터 가져오기
        const scheduleData = scheduleDataMap[channelType] || [];

        if (!scheduleData || !scheduleData.length) {
          return {
            ...station,
            mbcChannelType: channelType,
          };
        }

        // 현재 방송 중인 프로그램 찾기
        const currentProgram = getCurrentMBCProgram(scheduleData);

        if (currentProgram) {
          return {
            ...station,
            currentProgram,
            mbcChannelType: channelType,
          };
        }

        return {
          ...station,
          mbcChannelType: channelType,
        };
      } catch (error) {
        console.error(`MBC 스테이션 정보 추가 오류 (${station.id}):`, error);
        return station;
      }
    });

    return enrichedStations;
  } catch (error) {
    console.error('모든 MBC 스테이션 정보 추가 오류:', error);
    return stations;
  }
}

// 내부 import 처리
import { getMBCChannelName } from '../../constants/channelTypes';
import { formatDateDisplay } from '../../utils/dateUtils';
