/**
 * KBS 라디오 관련 API 서비스
 */
import { KBS_CHANNEL_TYPES, getKBSChannelName } from '../../constants/channelTypes';
import { getTodayDateString, formatDateDisplay, formatTimeKBS } from '../../utils/dateUtils';
import { isCacheValid, getCachedSchedule, cacheSchedule } from '../../utils/cacheUtils';

/**
 * KBS 라디오 편성표를 가져오는 함수
 * @param {string} channelCode - 채널 코드 (KBS_CHANNEL_TYPES 참조)
 * @param {string} date - 날짜 (YYYYMMDD 형식, 예: 20250923), 생략 시 오늘 날짜 사용
 * @returns {Promise<Array>} - 편성표 데이터 배열
 */
export async function fetchKBSSchedule(channelCode = KBS_CHANNEL_TYPES.HAPPY_FM, date = null) {
  try {
    // 채널 코드 유효성 검사
    if (!Object.values(KBS_CHANNEL_TYPES).includes(channelCode)) {
      throw new Error(`지원하지 않는 KBS 채널 코드입니다: ${channelCode}`);
    }

    // 날짜 파라미터 생략 시 오늘 날짜 사용
    const scheduleDate = date || getTodayDateString();

    // 캐시된 데이터 확인
    if (isCacheValid()) {
      const cachedData = getCachedSchedule('kbs', channelCode);
      if (cachedData) {
        console.log('KBS 편성표 캐시에서 로드됨:', channelCode);
        return cachedData;
      }
    }

    // KBS API URL
    const url = `https://static.api.kbs.co.kr/mediafactory/v1/schedule/weekly?&rtype=json&local_station_code=00&channel_code=${channelCode}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`KBS 편성표를 가져오는데 실패했습니다: ${response.status}`);
    }

    const data = await response.json();

    // 요청한 날짜의 데이터만 필터링
    const scheduleData = data.filter((item) => item.program_planned_date === scheduleDate);

    // 스케줄 데이터가 있으면 해당 날짜의 schedules 배열 반환
    if (scheduleData.length > 0 && scheduleData[0].schedules) {
      const filteredSchedules = scheduleData[0].schedules;

      // 데이터 캐싱
      cacheSchedule('kbs', channelCode, filteredSchedules);
      console.log('KBS 편성표 API에서 로드 및 캐싱됨:', channelCode);

      return filteredSchedules;
    }

    return [];
  } catch (error) {
    console.error('KBS 편성표 가져오기 오류:', error);
    return [];
  }
}

/**
 * 현재 방송 중인 프로그램 정보 가져오기 (KBS 형식)
 * @param {Array} scheduleData - 편성표 데이터
 * @param {Date} [referenceTime] - 기준 시간 (기본값: 현재 시간)
 * @returns {Object|null} - 현재 방송 중인 프로그램 정보
 */
export function getCurrentKBSProgram(scheduleData, referenceTime = new Date()) {
  if (!scheduleData || !scheduleData.length) return null;

  // 현재 시간을 HHMMSS 형식으로 변환
  const hours = referenceTime.getHours().toString().padStart(2, '0');
  const minutes = referenceTime.getMinutes().toString().padStart(2, '0');
  const seconds = referenceTime.getSeconds().toString().padStart(2, '0');
  const currentTime = hours + minutes + seconds; // 현재 시간 (HHMMSS 형식)

  // 현재 시간에 방송 중인 프로그램 찾기
  for (const program of scheduleData) {
    // 필수 필드 확인
    if (!program.program_planned_start_time || !program.program_planned_end_time || !program.program_title) {
      continue;
    }

    const startTime = program.program_planned_start_time;
    const endTime = program.program_planned_end_time;

    if (currentTime >= startTime && currentTime < endTime) {
      return {
        title: program.program_title,
        subtitle: program.program_subtitle || program.programming_table_title || '',
        startTime: formatTimeKBS(startTime),
        endTime: formatTimeKBS(endTime),
        imageUrl: program.image_w || '',
        homepageUrl: program.homepage_url || '',
        players: program.program_actor || '',
        producer: program.program_staff || '',
        runningTime: program.program_planned_duration_m || '',
        description: program.program_intention || '',
        channelName: program.channel_code_name || '',
      };
    }
  }

  return null;
}

/**
 * 지정된 날짜의 KBS 채널 전체 편성표 가져오기
 * @param {string} channelCode - 채널 코드 (KBS_CHANNEL_TYPES 참조)
 * @param {string} date - 날짜 (YYYYMMDD 형식)
 * @returns {Promise<Object>} - 편성표 데이터와 채널 정보
 */
export async function getKBSDailySchedule(channelCode = KBS_CHANNEL_TYPES.HAPPY_FM, date = getTodayDateString()) {
  try {
    const scheduleData = await fetchKBSSchedule(channelCode, date);

    // 채널 정보 추출
    const channelInfo = {
      code: channelCode,
      name: getKBSChannelName(channelCode),
      date: formatDateDisplay(date),
    };

    if (!scheduleData || !scheduleData.length) {
      return {
        channelInfo,
        programs: [],
        error: '편성표 데이터가 없습니다.',
      };
    }

    // 스케줄 데이터 정리
    const programs = scheduleData.map((program) => ({
      id: program.schedule_unique_id,
      title: program.program_title,
      subtitle: program.program_subtitle || program.programming_table_title || '',
      startTime: formatTimeKBS(program.program_planned_start_time),
      endTime: formatTimeKBS(program.program_planned_end_time),
      imageUrl: program.image_w || '',
      homepageUrl: program.homepage_url || '',
      players: program.program_actor || '',
      producer: program.program_staff || '',
      runningTime: program.program_planned_duration_m || '',
      description: program.program_intention || '',
      channelName: program.channel_code_name || '',
      rawData: program, // 원본 데이터도 포함해서 유연하게 활용
    }));

    return {
      channelInfo,
      programs,
      rawData: scheduleData, // 원본 데이터 제공
    };
  } catch (error) {
    console.error('KBS 일일 편성표 가져오기 오류:', error);
    return {
      channelInfo: {
        code: channelCode,
        name: getKBSChannelName(channelCode),
        date: formatDateDisplay(date),
      },
      programs: [],
      error: error.message,
    };
  }
}

/**
 * KBS 방송국 정보에 현재 프로그램 정보 추가
 * @param {Object} station - 방송국 정보
 * @returns {Promise<Object>} - 프로그램 정보가 추가된 방송국 정보
 */
export async function enrichKBSStationWithProgram(station) {
  if (station.type !== 'kbs') return station;

  try {
    // 방송국 ID에 따라 채널 코드 결정
    let channelCode = KBS_CHANNEL_TYPES.HAPPY_FM; // 기본값

    if (station.kbsChannelCode) {
      // 명시적으로 지정된 채널 코드 사용
      channelCode = station.kbsChannelCode;
    } else {
      // ID에 따라 채널 코드 매핑
      const channelCodeMap = {
        kbs2: KBS_CHANNEL_TYPES.HAPPY_FM, // Happy FM
        kbs2fm: KBS_CHANNEL_TYPES.COOL_FM, // Cool FM
        kbs1: KBS_CHANNEL_TYPES.RADIO_1, // 1라디오
        kbs3: KBS_CHANNEL_TYPES.RADIO_3, // 3라디오
        kbs1fm: KBS_CHANNEL_TYPES.CLASSIC_FM, // Classic FM
      };

      if (channelCodeMap[station.id]) {
        channelCode = channelCodeMap[station.id];
      }
    }

    const todayDate = getTodayDateString();
    const scheduleData = await fetchKBSSchedule(channelCode, todayDate);
    const currentProgram = getCurrentKBSProgram(scheduleData);

    if (currentProgram) {
      return {
        ...station,
        currentProgram: currentProgram,
        kbsChannelCode: channelCode, // 채널 코드 정보 추가
      };
    }

    return station;
  } catch (error) {
    console.error('KBS 프로그램 정보 추가 오류:', error);
    return station;
  }
}
