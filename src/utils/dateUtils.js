/**
 * 날짜 및 시간 관련 유틸리티 함수
 */

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
 * 주어진 날짜 문자열을 가져오거나 오늘 날짜 반환
 * @param {string|null} date - YYYY/M/D 형식의 날짜 (선택적)
 * @returns {Date} - 날짜 객체
 */
export function getDateFromString(date = null) {
  return date ? new Date(date) : new Date();
}

/**
 * 날짜 객체를 YYYY/M/D 형식으로 변환
 * @param {Date} date - 날짜 객체
 * @returns {Object} - {year, month, day} 형식의 객체
 */
export function getDateParts(date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}
