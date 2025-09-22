/**
 * 방송국 스케줄 관리 통합 서비스
 */
import { enrichMBCStationWithProgram } from './mbcService';
import { enrichKBSStationWithProgram } from './kbsService';
import { enrichSBSStationWithProgram } from './sbsService';
import { STATION_TYPES } from '../../constants/channelTypes';

/**
 * 방송국 정보에 현재 프로그램 정보 추가 (MBC/KBS/SBS 통합)
 * @param {Object} station - 방송국 정보
 * @returns {Promise<Object>} - 프로그램 정보가 추가된 방송국 정보
 */
export async function enrichStationWithProgram(station) {
  switch (station.type) {
    case STATION_TYPES.MBC:
      return enrichMBCStationWithProgram(station);
    case STATION_TYPES.KBS:
      return enrichKBSStationWithProgram(station);
    case STATION_TYPES.SBS:
      return enrichSBSStationWithProgram(station);
    default:
      return station;
  }
}

/**
 * 모든 방송국에 프로그램 정보 추가 (MBC/KBS/SBS 통합)
 * @param {Array} stations - 방송국 목록
 * @returns {Promise<Array>} - 프로그램 정보가 추가된 방송국 목록
 */
export async function enrichAllStations(stations = []) {
  const enrichedStations = [];

  for (const station of stations) {
    try {
      const enrichedStation = await enrichStationWithProgram(station);
      enrichedStations.push(enrichedStation);
    } catch (error) {
      console.error(`방송국 정보 추가 오류 (${station.id}):`, error);
      enrichedStations.push(station);
    }
  }

  return enrichedStations;
}
