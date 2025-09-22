/**
 * 각 방송국 채널 유형 상수 정의
 */

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
 * 방송국 타입 정의
 */
export const STATION_TYPES = {
  MBC: 'mbc',
  KBS: 'kbs',
  SBS: 'sbs',
  STATIC: 'static',
};

/**
 * 채널 유형에 따른 이름 반환 (MBC)
 * @param {string} channelType - 채널 유형
 * @returns {string} - 채널 이름
 */
export function getMBCChannelName(channelType) {
  const channelNames = {
    [MBC_CHANNEL_TYPES.FM]: 'MBC 표준FM',
    [MBC_CHANNEL_TYPES.FM4U]: 'MBC FM4U',
  };

  return channelNames[channelType] || '알 수 없는 MBC 채널';
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
