/**
 * 방송국 스케줄 서비스 모듈 (통합 내보내기)
 */

// 방송국 타입 및 채널 상수
export {
  MBC_CHANNEL_TYPES,
  KBS_CHANNEL_TYPES,
  SBS_CHANNEL_TYPES,
  STATION_TYPES,
  getMBCChannelName,
  getKBSChannelName,
  getSBSChannelName,
} from '../constants/channelTypes';

// 날짜 유틸리티 함수
export { getTodayDateString, formatDateDisplay, getDayOfWeek, formatTime, formatTimeKBS } from '../utils/dateUtils';

// MBC 관련 API 함수
export { fetchMBCSchedule, getCurrentMBCProgram, getMBCDailySchedule, enrichMBCStationWithProgram, enrichAllMBCStations } from './api/mbcService';

// KBS 관련 API 함수
export { fetchKBSSchedule, getCurrentKBSProgram, getKBSDailySchedule, enrichKBSStationWithProgram } from './api/kbsService';

// SBS 관련 API 함수
export { fetchSBSSchedule, getCurrentSBSProgram, getSBSDailySchedule, enrichSBSStationWithProgram } from './api/sbsService';

// 통합 스케줄 서비스
export { enrichStationWithProgram, enrichAllStations } from './api/scheduleService';
