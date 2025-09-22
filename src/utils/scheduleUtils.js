// 편성표 관련 유틸리티 함수
import { getTodayDateString } from './dateUtils';

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
