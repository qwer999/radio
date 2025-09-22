// 라디오 방송국 편성표 데이터 가져오기 기능
import { radioStations } from './radioStations';

/**
 * MBC 채널 유형 정의
 */
export const MBC_CHANNEL_TYPES = {
  FM: 'fm',
  FM4U: 'fm4u',
  // 향후 다른 채널도 추가 가능
};

/**
 * KBS 채널 유형 정의
 */
export const KBS_CHANNEL_TYPES = {
  HAPPY_FM: '22', // KBS 2 라디오 (Happy FM)
  COOL_FM: '25', // KBS 2 FM (Cool FM)
  RADIO_1: '21', // KBS 1 라디오
  RADIO_3: '23', // KBS 3 라디오
  CLASSIC_FM: '24', // KBS 1 FM (Classic FM)
  // 향후 다른 채널도 추가 가능
};

/**
 * SBS 채널 유형 정의
 */
export const SBS_CHANNEL_TYPES = {
  POWER_FM: 'Power', // SBS 파워FM
  LOVE_FM: 'Love', // SBS 러브FM
  GORILLA_M: 'DMB+Radio', // SBS 고릴라M (URL에서 공백 대신 +를 사용)
  // 향후 다른 채널도 추가 가능
};

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

    // 날짜 파라미터 생략 시 오늘 날짜 사용
    const today = date ? new Date(date) : new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // SBS API URL (YYYY/M/D 형식 사용)
    const url = `https://static.cloud.sbs.co.kr/schedule/${year}/${month}/${day}/${channelType}.json`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`SBS 편성표를 가져오는데 실패했습니다: ${response.status}`);
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error('SBS 편성표 가져오기 오류:', error);
    return [];
  }
}

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
      return scheduleData[0].schedules;
    }

    return [];
  } catch (error) {
    console.error('KBS 편성표 가져오기 오류:', error);
    return [];
  }
}

/**
 * 현재 방송 중인 프로그램 정보 가져오기 (MBC 형식)
 * @param {Array} scheduleData - 편성표 데이터
 * @param {Date} [referenceTime] - 기준 시간 (기본값: 현재 시간)
 * @returns {Object|null} - 현재 방송 중인 프로그램 정보
 */
export function getCurrentProgram(scheduleData, referenceTime = new Date()) {
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
 * 시간 형식 변환 (HHMM -> HH:MM)
 * @param {string} timeString - HHMM 형식의 시간
 * @returns {string} - HH:MM 형식의 시간
 */
export function formatTime(timeString) {
  if (timeString.length !== 4) return timeString;
  return `${timeString.substring(0, 2)}:${timeString.substring(2, 4)}`;
}

/**
 * KBS 시간 형식 변환 (HHMMSS -> HH:MM)
 * @param {string} timeString - HHMMSS 형식의 시간
 * @returns {string} - HH:MM 형식의 시간
 */
export function formatTimeKBS(timeString) {
  if (timeString.length !== 8) return timeString;
  return `${timeString.substring(0, 2)}:${timeString.substring(2, 4)}`;
}

/**
 * 오늘 날짜를 YYYYMMDD 형식으로 반환
 * @returns {string} - YYYYMMDD 형식의 날짜
 */
export function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');

  return `${year}${month}${day}`;
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
      name: getChannelName(channelType),
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
        name: getChannelName(channelType),
        date: formatDateDisplay(date),
      },
      programsByDate: {},
      error: error.message,
    };
  }
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
 * 채널 유형에 따른 이름 반환 (SBS)
 * @param {string} channelType - 채널 유형
 * @returns {string} - 채널 이름
 */
export function getSBSChannelName(channelType) {
  const channelNames = {
    [SBS_CHANNEL_TYPES.POWER_FM]: 'SBS 파워FM',
    [SBS_CHANNEL_TYPES.LOVE_FM]: 'SBS 러브FM',
    [SBS_CHANNEL_TYPES.GORILLA_M]: 'SBS 고릴라M',
  };

  return channelNames[channelType] || '알 수 없는 SBS 채널';
}

/**
 * 채널 유형에 따른 이름 반환 (MBC)
 * @param {string} channelType - 채널 유형
 * @returns {string} - 채널 이름
 */
export function getChannelName(channelType) {
  const channelNames = {
    [MBC_CHANNEL_TYPES.FM]: 'MBC 표준FM',
    [MBC_CHANNEL_TYPES.FM4U]: 'MBC FM4U',
  };

  return channelNames[channelType] || '알 수 없는 채널';
}

/**
 * 채널 코드에 따른 이름 반환 (KBS)
 * @param {string} channelCode - 채널 코드
 * @returns {string} - 채널 이름
 */
export function getKBSChannelName(channelCode) {
  const channelNames = {
    [KBS_CHANNEL_TYPES.HAPPY_FM]: 'KBS 해피FM',
    [KBS_CHANNEL_TYPES.COOL_FM]: 'KBS 쿨FM',
    [KBS_CHANNEL_TYPES.RADIO_1]: 'KBS 1라디오',
    [KBS_CHANNEL_TYPES.RADIO_3]: 'KBS 3라디오',
    [KBS_CHANNEL_TYPES.CLASSIC_FM]: 'KBS 클래식FM',
  };

  return channelNames[channelCode] || '알 수 없는 KBS 채널';
}

/**
 * 날짜 형식 변환 (YYYYMMDD -> YYYY년 MM월 DD일)
 * @param {string} dateString - YYYYMMDD 형식의 날짜
 * @returns {string} - YYYY년 MM월 DD일 형식의 날짜
 */
export function formatDateDisplay(dateString) {
  if (!dateString || dateString.length !== 8) return dateString;

  const year = dateString.substring(0, 4);
  const month = dateString.substring(4, 6);
  const day = dateString.substring(6, 8);

  return `${year}년 ${month}월 ${day}일 (${getDayOfWeek(dateString)})`;
}

/**
 * 요일 구하기
 * @param {string} dateString - YYYYMMDD 형식의 날짜
 * @returns {string} - 요일 (일, 월, 화, 수, 목, 금, 토)
 */
export function getDayOfWeek(dateString) {
  if (!dateString || dateString.length !== 8) return '';

  const year = parseInt(dateString.substring(0, 4));
  const month = parseInt(dateString.substring(4, 6)) - 1;
  const day = parseInt(dateString.substring(6, 8));

  const date = new Date(year, month, day);
  const days = ['일', '월', '화', '수', '목', '금', '토'];

  return days[date.getDay()];
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
    const currentProgram = getCurrentProgram(scheduleData);

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
export async function enrichAllMBCStations(stations = radioStations) {
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
        const currentProgram = getCurrentProgram(scheduleData);

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

/**
 * 방송국 정보에 현재 프로그램 정보 추가 (MBC/KBS/SBS 통합)
 * @param {Object} station - 방송국 정보
 * @returns {Promise<Object>} - 프로그램 정보가 추가된 방송국 정보
 */
export async function enrichStationWithProgram(station) {
  if (station.type === 'mbc') {
    return enrichMBCStationWithProgram(station);
  } else if (station.type === 'kbs') {
    return enrichKBSStationWithProgram(station);
  } else if (station.type === 'sbs') {
    return enrichSBSStationWithProgram(station);
  }
  return station;
}

/**
 * 모든 방송국에 프로그램 정보 추가 (MBC/KBS 통합)
 * @param {Array} stations - 방송국 목록
 * @returns {Promise<Array>} - 프로그램 정보가 추가된 방송국 목록
 */
export async function enrichAllStations(stations = radioStations) {
  // 병렬로 모든 방송국 정보 가져오기
  const promises = stations.map((station) => enrichStationWithProgram(station));
  const enrichedStations = await Promise.all(promises);

  return enrichedStations;
}
