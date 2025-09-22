/**
 * 스케줄 데이터의 로컬 스토리지 캐싱 관련 유틸리티
 */

// 로컬 스토리지 키 상수
const CACHE_KEYS = {
  MBC_SCHEDULE: 'mbcScheduleCache',
  KBS_SCHEDULE: 'kbsScheduleCache',
  SBS_SCHEDULE: 'sbsScheduleCache',
  CACHE_DATE: 'scheduleCacheDate',
};

/**
 * 오늘 날짜 문자열 가져오기 (YYYY-MM-DD 형식)
 * @returns {string} 오늘 날짜
 */
const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * 캐시된 날짜 확인
 * @returns {string|null} 캐시된 날짜 또는 null
 */
export const getCachedDate = () => {
  return localStorage.getItem(CACHE_KEYS.CACHE_DATE);
};

/**
 * 캐시가 오늘 날짜인지 확인
 * @returns {boolean} 캐시가 오늘 날짜인 경우 true
 */
export const isCacheValid = () => {
  const cachedDate = getCachedDate();
  const today = getTodayString();
  return cachedDate === today;
};

/**
 * 캐시된 스케줄 데이터 가져오기
 * @param {string} stationType - 방송국 유형 ('mbc', 'kbs', 'sbs')
 * @param {string} channelType - 채널 유형
 * @returns {Object|null} 캐시된 스케줄 데이터 또는 null
 */
export const getCachedSchedule = (stationType, channelType) => {
  if (!isCacheValid()) {
    return null;
  }

  let cacheKey;
  switch (stationType.toLowerCase()) {
    case 'mbc':
      cacheKey = `${CACHE_KEYS.MBC_SCHEDULE}_${channelType}`;
      break;
    case 'kbs':
      cacheKey = `${CACHE_KEYS.KBS_SCHEDULE}_${channelType}`;
      break;
    case 'sbs':
      cacheKey = `${CACHE_KEYS.SBS_SCHEDULE}_${channelType}`;
      break;
    default:
      return null;
  }

  try {
    const cachedData = localStorage.getItem(cacheKey);
    return cachedData ? JSON.parse(cachedData) : null;
  } catch (error) {
    console.error('캐시 데이터 파싱 오류:', error);
    return null;
  }
};

/**
 * 스케줄 데이터를 캐시에 저장
 * @param {string} stationType - 방송국 유형 ('mbc', 'kbs', 'sbs')
 * @param {string} channelType - 채널 유형
 * @param {Object} data - 저장할 스케줄 데이터
 */
export const cacheSchedule = (stationType, channelType, data) => {
  if (!data) return;

  let cacheKey;
  switch (stationType.toLowerCase()) {
    case 'mbc':
      cacheKey = `${CACHE_KEYS.MBC_SCHEDULE}_${channelType}`;
      break;
    case 'kbs':
      cacheKey = `${CACHE_KEYS.KBS_SCHEDULE}_${channelType}`;
      break;
    case 'sbs':
      cacheKey = `${CACHE_KEYS.SBS_SCHEDULE}_${channelType}`;
      break;
    default:
      return;
  }

  try {
    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(CACHE_KEYS.CACHE_DATE, getTodayString());
  } catch (error) {
    console.error('스케줄 데이터 캐싱 오류:', error);
  }
};

/**
 * 모든 캐시 데이터 삭제
 */
export const clearAllCaches = () => {
  Object.values(CACHE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
};

/**
 * 특정 방송국의 캐시 데이터 삭제
 * @param {string} stationType - 방송국 유형 ('mbc', 'kbs', 'sbs')
 */
export const clearStationCache = (stationType) => {
  let keyPrefix;
  switch (stationType.toLowerCase()) {
    case 'mbc':
      keyPrefix = CACHE_KEYS.MBC_SCHEDULE;
      break;
    case 'kbs':
      keyPrefix = CACHE_KEYS.KBS_SCHEDULE;
      break;
    case 'sbs':
      keyPrefix = CACHE_KEYS.SBS_SCHEDULE;
      break;
    default:
      return;
  }

  // localStorage에서 해당 prefix로 시작하는 모든 키 찾기
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(keyPrefix)) {
      localStorage.removeItem(key);
    }
  });
};
