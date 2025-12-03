// 한국 시간 기준 날짜 유틸리티

/**
 * Date 객체를 한국 시간 기준 날짜 문자열(YYYY-MM-DD)로 변환
 */
export function getKoreanDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 오늘 날짜를 한국 시간 기준 문자열로 반환
 */
export function getTodayKoreanDateString(): string {
  return getKoreanDateString(new Date());
}

/**
 * 최근 N일의 평일(월~금) 날짜 목록 반환 (과거순 - 오른쪽이 최신)
 * @param count 가져올 평일 수
 * @returns 날짜 문자열 배열 (오래된 날짜가 첫 번째, 최신 날짜가 마지막)
 */
export function getLastWeekdays(count: number): string[] {
  const dates: string[] = [];
  let daysAdded = 0;
  let daysBack = 0;

  while (daysAdded < count) {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    const dayOfWeek = date.getDay();

    // 평일만 (월~금)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      dates.unshift(getKoreanDateString(date)); // 앞에 추가하여 오래된 날짜가 먼저 오도록
      daysAdded++;
    }
    daysBack++;
  }
  return dates; // 오래된 날짜가 첫 번째, 최신 날짜가 마지막
}

/**
 * 최근 N일의 평일 날짜와 데이터를 매핑
 * @param count 가져올 평일 수
 * @param grassData 잔디 데이터
 * @returns 날짜와 쿠키 변화량 배열 (오래된 날짜가 첫 번째, 최신 날짜가 마지막)
 */
export function getLastWeekdaysWithData(
  count: number,
  grassData: Array<{ date: string; cookieChange: number; count: number }>
): Array<{ date: string; count: number }> {
  const dates = getLastWeekdays(count);
  return dates.map(dateStr => {
    const record = grassData.find(g => g.date === dateStr);
    return {
      date: dateStr,
      count: record?.cookieChange || 0
    };
  });
}
