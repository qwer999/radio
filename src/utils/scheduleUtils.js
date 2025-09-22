// 편성표 관련 유틸리티 함수
import { getTodayDateString } from './dateUtils';
import {
  fetchMBCSchedule,
  fetchKBSSchedule,
  fetchSBSSchedule,
  MBC_CHANNEL_TYPES,
  KBS_CHANNEL_TYPES,
  SBS_CHANNEL_TYPES,
  getCurrentProgram,
  getCurrentKBSProgram,
  getCurrentSBSProgram,
} from '../assets/radioSchedule';

/**
 * 특정 프로그램이 현재 방송 중인지 확인
 *
 * @param {Object} program - 프로그램 정보 객체
 * @param {string} program.startTime - 시작 시간 (HH:MM 형식)
 * @param {string} program.endTime - 종료 시간 (HH:MM 형식)
 * @param {string} date - 날짜 문자열 (YYYY-MM-DD 형식)
 * @returns {boolean} - 현재 방송 중인지 여부
 */
export function isCurrentProgram(program, date) {
  if (!program.startTime || !program.endTime) return false;

  const now = new Date();
  const currentDate = new Date(date);
  currentDate.setHours(now.getHours(), now.getMinutes(), 0, 0);

  const startTimeParts = program.startTime.split(':');
  const endTimeParts = program.endTime.split(':');

  const startDateTime = new Date(date);
  startDateTime.setHours(parseInt(startTimeParts[0]), parseInt(startTimeParts[1]), 0, 0);

  const endDateTime = new Date(date);
  endDateTime.setHours(parseInt(endTimeParts[0]), parseInt(endTimeParts[1]), 0, 0);

  // 현재 날짜가 오늘이고, 현재 시간이 시작 시간과 종료 시간 사이에 있는지 확인
  return date === getTodayDateString() && currentDate >= startDateTime && currentDate < endDateTime;
}

/**
 * 현재 방송 중인 프로그램 찾기
 *
 * @param {Array} programs - 프로그램 목록
 * @param {string} date - 날짜 문자열 (YYYY-MM-DD 형식)
 * @returns {Object|null} - 현재 방송 중인 프로그램 또는 null
 */
export function findCurrentProgram(programs, date) {
  if (!programs || !Array.isArray(programs)) return null;
  return programs.find((program) => isCurrentProgram(program, date)) || null;
}

/**
 * 두 프로그램 목록을 합치고 시간순으로 정렬
 *
 * @param {Array} programs1 - 첫 번째 프로그램 목록
 * @param {Array} programs2 - 두 번째 프로그램 목록
 * @returns {Array} - 합쳐진 프로그램 목록 (시간순 정렬)
 */
export function mergeAndSortPrograms(programs1, programs2) {
  const merged = [...(programs1 || []), ...(programs2 || [])];

  return merged.sort((a, b) => {
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;

    const timeA = a.startTime.split(':').map(Number);
    const timeB = b.startTime.split(':').map(Number);

    // 시간으로 비교
    if (timeA[0] !== timeB[0]) return timeA[0] - timeB[0];

    // 분으로 비교
    return timeA[1] - timeB[1];
  });
}

/**
 * 프로그램 목록을 날짜별로 그룹화
 *
 * @param {Array} programs - 프로그램 목록
 * @param {string} dateField - 날짜 필드명
 * @returns {Object} - 날짜별로 그룹화된 프로그램 목록
 */
export function groupProgramsByDate(programs, dateField = 'date') {
  if (!programs || !Array.isArray(programs)) return {};

  return programs.reduce((groups, program) => {
    const date = program[dateField];
    if (!date) return groups;

    if (!groups[date]) {
      groups[date] = [];
    }

    groups[date].push(program);
    return groups;
  }, {});
}

// 메모리에 저장될 스케줄 데이터 구조
let scheduleCache = {
  // 마지막으로 데이터를 가져온 날짜
  lastFetchDate: null,
  // MBC 편성표 데이터
  mbc: {
    [MBC_CHANNEL_TYPES.FM]: null,
    [MBC_CHANNEL_TYPES.FM4U]: null,
  },
  // KBS 편성표 데이터
  kbs: {
    [KBS_CHANNEL_TYPES.HAPPY_FM]: null,
    [KBS_CHANNEL_TYPES.COOL_FM]: null,
    [KBS_CHANNEL_TYPES.RADIO_1]: null,
    [KBS_CHANNEL_TYPES.RADIO_3]: null,
    [KBS_CHANNEL_TYPES.CLASSIC_FM]: null,
  },
  // SBS 편성표 데이터
  sbs: {
    [SBS_CHANNEL_TYPES.POWER_FM]: null,
    [SBS_CHANNEL_TYPES.LOVE_FM]: null,
    [SBS_CHANNEL_TYPES.GORILLA_M]: null,
  },
  // 마지막 업데이트 시간 (방송국별)
  lastUpdateTime: {
    mbc: {},
    kbs: {},
    sbs: {},
  },
};

/**
 * 캐시가 오늘 날짜인지 확인
 * @returns {boolean} 캐시가 오늘 날짜인 경우 true
 */
export const isMemoryCacheValid = () => {
  const today = getTodayDateString();
  return scheduleCache.lastFetchDate === today;
};

/**
 * 메모리 캐시에서 스케줄 데이터 가져오기
 * @param {string} stationType - 방송국 유형 ('mbc', 'kbs', 'sbs')
 * @param {string} channelType - 채널 유형/코드
 * @returns {Object|null} 캐시된 스케줄 데이터 또는 null
 */
export const getScheduleFromMemory = (stationType, channelType) => {
  if (!isMemoryCacheValid()) {
    return null;
  }

  const type = stationType.toLowerCase();
  if (scheduleCache[type] && scheduleCache[type][channelType]) {
    return scheduleCache[type][channelType];
  }

  return null;
};

/**
 * 모든 방송국의 편성표 데이터를 한 번에 가져와 메모리에 저장
 * @returns {Promise<boolean>} 성공 시 true 반환
 */
export const fetchAllSchedules = async () => {
  try {
    const today = getTodayDateString();

    // 날짜가 변경되지 않았고 모든 데이터가 이미 있으면 중복 요청 방지
    if (isMemoryCacheValid() && isAllScheduleDataAvailable()) {
      console.log('모든 편성표 데이터가 이미 메모리에 있습니다.');
      return true;
    }

    console.log('모든 편성표 데이터를 새로 가져옵니다...');

    // 병렬로 모든 편성표 데이터 가져오기
    const promises = [
      // MBC 편성표
      fetchMBCSchedule(today, MBC_CHANNEL_TYPES.FM),
      fetchMBCSchedule(today, MBC_CHANNEL_TYPES.FM4U),

      // KBS 편성표
      fetchKBSSchedule(KBS_CHANNEL_TYPES.HAPPY_FM, today),
      fetchKBSSchedule(KBS_CHANNEL_TYPES.COOL_FM, today),
      fetchKBSSchedule(KBS_CHANNEL_TYPES.RADIO_1, today),
      fetchKBSSchedule(KBS_CHANNEL_TYPES.RADIO_3, today),
      fetchKBSSchedule(KBS_CHANNEL_TYPES.CLASSIC_FM, today),

      // SBS 편성표
      fetchSBSSchedule(SBS_CHANNEL_TYPES.POWER_FM),
      fetchSBSSchedule(SBS_CHANNEL_TYPES.LOVE_FM),
      fetchSBSSchedule(SBS_CHANNEL_TYPES.GORILLA_M),
    ];

    const results = await Promise.all(promises);

    // 결과를 메모리 캐시에 저장
    scheduleCache.mbc[MBC_CHANNEL_TYPES.FM] = results[0];
    scheduleCache.mbc[MBC_CHANNEL_TYPES.FM4U] = results[1];

    scheduleCache.kbs[KBS_CHANNEL_TYPES.HAPPY_FM] = results[2];
    scheduleCache.kbs[KBS_CHANNEL_TYPES.COOL_FM] = results[3];
    scheduleCache.kbs[KBS_CHANNEL_TYPES.RADIO_1] = results[4];
    scheduleCache.kbs[KBS_CHANNEL_TYPES.RADIO_3] = results[5];
    scheduleCache.kbs[KBS_CHANNEL_TYPES.CLASSIC_FM] = results[6];

    scheduleCache.sbs[SBS_CHANNEL_TYPES.POWER_FM] = results[7];
    scheduleCache.sbs[SBS_CHANNEL_TYPES.LOVE_FM] = results[8];
    scheduleCache.sbs[SBS_CHANNEL_TYPES.GORILLA_M] = results[9];

    // 마지막 가져온 날짜 업데이트
    scheduleCache.lastFetchDate = today;

    // 모든 방송국의 마지막 업데이트 시간 초기화
    const now = new Date().toISOString();
    Object.keys(scheduleCache.lastUpdateTime).forEach((stationType) => {
      Object.keys(scheduleCache[stationType]).forEach((channelType) => {
        if (scheduleCache[stationType][channelType]) {
          scheduleCache.lastUpdateTime[stationType][channelType] = now;
        }
      });
    });

    console.log('모든 편성표 데이터를 메모리에 저장했습니다.');
    return true;
  } catch (error) {
    console.error('편성표 데이터를 가져오는 중 오류 발생:', error);
    return false;
  }
};

/**
 * 특정 방송국의 편성표만 업데이트
 * @param {string} stationType - 방송국 유형 ('mbc', 'kbs', 'sbs')
 * @param {string} channelType - 채널 유형/코드
 * @returns {Promise<boolean>} 성공 시 true 반환
 */
export const updateStationSchedule = async (stationType, channelType) => {
  try {
    if (!stationType || !channelType) {
      console.error('방송국 유형과 채널 유형이 필요합니다.');
      return false;
    }

    const today = getTodayDateString();
    console.log(`${stationType} ${channelType} 편성표 데이터를 새로 가져옵니다...`);

    let scheduleData = null;

    // 방송국 유형에 따라 다른 API 호출
    switch (stationType.toLowerCase()) {
      case 'mbc':
        scheduleData = await fetchMBCSchedule(today, channelType);
        break;
      case 'kbs':
        scheduleData = await fetchKBSSchedule(channelType, today);
        break;
      case 'sbs':
        scheduleData = await fetchSBSSchedule(channelType);
        break;
      default:
        console.error(`지원하지 않는 방송국 유형: ${stationType}`);
        return false;
    }

    // 결과를 메모리 캐시에 저장
    if (scheduleData) {
      scheduleCache[stationType.toLowerCase()][channelType] = scheduleData;

      // 마지막 업데이트 시간 기록
      scheduleCache.lastUpdateTime[stationType.toLowerCase()][channelType] = new Date().toISOString();

      console.log(`${stationType} ${channelType} 편성표 데이터를 메모리에 업데이트했습니다.`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`${stationType} ${channelType} 편성표 데이터 업데이트 중 오류 발생:`, error);
    return false;
  }
};

/**
 * 메모리에서 현재 프로그램 정보 가져오기
 * @param {string} stationType - 방송국 유형 ('mbc', 'kbs', 'sbs')
 * @param {string} channelType - 채널 유형/코드
 * @returns {Object|null} 현재 프로그램 정보
 */
export const getCurrentProgramFromMemory = (stationType, channelType) => {
  try {
    const type = stationType.toLowerCase();
    const scheduleData = getScheduleFromMemory(type, channelType);

    if (!scheduleData) return null;

    // 방송국 유형에 따라 다른 처리
    switch (type) {
      case 'mbc':
        return getCurrentProgram(scheduleData);
      case 'kbs':
        return getCurrentKBSProgram(scheduleData);
      case 'sbs':
        return getCurrentSBSProgram(scheduleData);
      default:
        return null;
    }
  } catch (error) {
    console.error('현재 프로그램 정보 가져오기 오류:', error);
    return null;
  }
};

/**
 * 모든 스케줄 데이터가 메모리에 있는지 확인
 * @returns {boolean} 모든 필수 채널 데이터가 있으면 true
 */
const isAllScheduleDataAvailable = () => {
  // 핵심 채널만 확인 (MBC FM, MBC FM4U, KBS 해피FM, SBS 파워FM)
  return (
    scheduleCache.mbc[MBC_CHANNEL_TYPES.FM] &&
    scheduleCache.mbc[MBC_CHANNEL_TYPES.FM4U] &&
    scheduleCache.kbs[KBS_CHANNEL_TYPES.HAPPY_FM] &&
    scheduleCache.sbs[SBS_CHANNEL_TYPES.POWER_FM]
  );
};

/**
 * 메모리 캐시 내용 초기화
 */
export const clearMemoryCache = () => {
  scheduleCache = {
    lastFetchDate: null,
    mbc: {
      [MBC_CHANNEL_TYPES.FM]: null,
      [MBC_CHANNEL_TYPES.FM4U]: null,
    },
    kbs: {
      [KBS_CHANNEL_TYPES.HAPPY_FM]: null,
      [KBS_CHANNEL_TYPES.COOL_FM]: null,
      [KBS_CHANNEL_TYPES.RADIO_1]: null,
      [KBS_CHANNEL_TYPES.RADIO_3]: null,
      [KBS_CHANNEL_TYPES.CLASSIC_FM]: null,
    },
    sbs: {
      [SBS_CHANNEL_TYPES.POWER_FM]: null,
      [SBS_CHANNEL_TYPES.LOVE_FM]: null,
      [SBS_CHANNEL_TYPES.GORILLA_M]: null,
    },
    lastUpdateTime: {
      mbc: {},
      kbs: {},
      sbs: {},
    },
  };
};

/**
 * 메모리에 저장된 모든 스케줄 데이터 가져오기
 * @returns {Object} 모든 스케줄 데이터
 */
export const getAllScheduleData = () => {
  return { ...scheduleCache };
};
