/**
 * SBS 라디오 관련 API 서비스
 */
import { SBS_CHANNEL_TYPES, getSBSChannelName } from '../../constants/channelTypes';
import { getTodayDateString, formatDateDisplay, getDateFromString, getDateParts } from '../../utils/dateUtils';
import { isCacheValid, getCachedSchedule, cacheSchedule } from '../../utils/cacheUtils';

/**
 * SBS 라디오 편성표를 가져오는 함수
 * @param {string} channelType - 채널 유형 (SBS_CHANNEL_TYPES 참조)
 * @param {string} date - 날짜 (YYYY/M/D 형식, 예: 2025/9/22), 생략 시 오늘 날짜 사용
 * @returns {Promise<Array>} - 편성표 데이터 배열
 */
export async function fetchSBSSchedule(channelType = SBS_CHANNEL_TYPES.POWER_FM, date = null) {
  try {
    // 채널 유형 유효성 검사
    if (!Object.values(SBS_CHANNEL_TYPES).includes(channelType)) {
      throw new Error(`지원하지 않는 SBS 채널 유형입니다: ${channelType}`);
    }

    // 캐시된 데이터 확인
    if (isCacheValid()) {
      const cachedData = getCachedSchedule('sbs', channelType);
      if (cachedData) {
        console.log('SBS 편성표 캐시에서 로드됨:', channelType);
        return cachedData;
      }
    }

    // 날짜 파라미터 생략 시 오늘 날짜 사용
    const today = getDateFromString(date);
    const { year, month, day } = getDateParts(today);

    // SBS API URL (YYYY/M/D 형식 사용)
    const url = `https://static.cloud.sbs.co.kr/schedule/${year}/${month}/${day}/${channelType}.json`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`SBS 편성표를 가져오는데 실패했습니다: ${response.status}`);
    }

    const data = await response.json();

    // 데이터 캐싱
    cacheSchedule('sbs', channelType, data);
    console.log('SBS 편성표 API에서 로드 및 캐싱됨:', channelType);

    return data;
  } catch (error) {
    console.error('SBS 편성표 가져오기 오류:', error);
    return [];
  }
}

/**
 * 현재 방송 중인 프로그램 정보 가져오기 (SBS 형식)
 * @param {Array} scheduleData - 편성표 데이터
 * @param {Date} [referenceTime] - 기준 시간 (기본값: 현재 시간)
 * @returns {Object|null} - 현재 방송 중인 프로그램 정보
 */
export function getCurrentSBSProgram(scheduleData, referenceTime = new Date()) {
  if (!scheduleData || !Array.isArray(scheduleData)) return null;

  const now = referenceTime;
  const hours = now.getHours();
  const minutes = now.getMinutes();

  // 현재 시간 (분 단위)
  const currentMinutes = hours * 60 + minutes;

  // 현재 시간에 방송 중인 프로그램 찾기
  for (const program of scheduleData) {
    // 필수 필드 확인
    if (!program.start_time || !program.end_time || !program.title) {
      continue;
    }

    // 시작 시간과 종료 시간을 분 단위로 변환
    const startTimeParts = program.start_time.split(':');
    const endTimeParts = program.end_time.split(':');

    if (startTimeParts.length < 2 || endTimeParts.length < 2) {
      continue;
    }

    const startMinutes = parseInt(startTimeParts[0]) * 60 + parseInt(startTimeParts[1]);
    const endMinutes = parseInt(endTimeParts[0]) * 60 + parseInt(endTimeParts[1]);

    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      return {
        title: program.title,
        subtitle: program.programcode || '',
        startTime: program.start_time,
        endTime: program.end_time,
        imageUrl: program.program_image || '',
        homepageUrl: program.homepage_url || '',
        players: program.guest || '',
        description: program.description || '',
        channelName: 'SBS ' + (program.title.includes('파워') ? '파워FM' : '러브FM'),
      };
    }
  }

  return null;
}

/**
 * 지정된 날짜의 SBS 채널 전체 편성표 가져오기
 * @param {string} channelType - 채널 유형 (SBS_CHANNEL_TYPES 참조)
 * @param {string} date - 날짜 (YYYY-MM-DD 형식)
 * @returns {Promise<Object>} - 편성표 데이터와 채널 정보
 */
export async function getSBSDailySchedule(channelType = SBS_CHANNEL_TYPES.POWER_FM, date = null) {
  try {
    const scheduleData = await fetchSBSSchedule(channelType, date);

    // 날짜 정보 추출 (오늘 날짜 또는 지정된 날짜)
    const requestDate = date ? new Date(date) : new Date();
    const formattedDate = `${requestDate.getFullYear()}${String(requestDate.getMonth() + 1).padStart(2, '0')}${String(requestDate.getDate()).padStart(
      2,
      '0',
    )}`;

    // 채널 정보 추출
    const channelInfo = {
      type: channelType,
      name: getSBSChannelName(channelType),
      date: formatDateDisplay(formattedDate),
    };

    if (!scheduleData || !Array.isArray(scheduleData) || !scheduleData.length) {
      return {
        channelInfo,
        programs: [],
        error: '편성표 데이터가 없습니다.',
      };
    }

    return {
      channelInfo,
      programs: scheduleData,
      rawData: scheduleData,
    };
  } catch (error) {
    console.error('SBS 일일 편성표 가져오기 오류:', error);
    return {
      channelInfo: {
        type: channelType,
        name: getSBSChannelName(channelType),
        date: date ? formatDateDisplay(date.replace(/-/g, '')) : formatDateDisplay(getTodayDateString()),
      },
      programs: [],
      error: error.message,
    };
  }
}

/**
 * SBS 방송국 정보에 현재 프로그램 정보 추가
 * @param {Object} station - 방송국 정보
 * @returns {Promise<Object>} - 프로그램 정보가 추가된 방송국 정보
 */
export async function enrichSBSStationWithProgram(station) {
  if (station.type !== 'sbs') return station;

  try {
    // 방송국 ID에 따라 채널 타입 결정
    let channelType = SBS_CHANNEL_TYPES.POWER_FM; // 기본값

    if (station.sbsChannelType) {
      // 명시적으로 지정된 채널 타입 사용
      channelType = station.sbsChannelType;
    } else {
      // ID에 따라 채널 타입 매핑
      const channelTypeMap = {
        sbs_powerfm: SBS_CHANNEL_TYPES.POWER_FM,
        sbs_lovefm: SBS_CHANNEL_TYPES.LOVE_FM,
        sbs_gorilla: SBS_CHANNEL_TYPES.GORILLA_M,
      };

      if (channelTypeMap[station.id]) {
        channelType = channelTypeMap[station.id];
      }
    }

    // SBS 스케줄 데이터 가져오기
    const scheduleData = await fetchSBSSchedule(channelType);
    const currentProgram = getCurrentSBSProgram(scheduleData);

    if (currentProgram) {
      return {
        ...station,
        currentProgram: currentProgram,
        sbsChannelType: channelType, // 채널 타입 정보 추가
      };
    }

    return station;
  } catch (error) {
    console.error('SBS 프로그램 정보 추가 오류:', error);
    return station;
  }
}
