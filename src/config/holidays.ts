/**
 * holidays.ts — 中国法定节假日与调休工作日静态配置
 *
 * 数据来源：国务院办公厅 2025-11-04 发布
 * 《国务院办公厅关于 2026 年部分节假日安排的通知》（国办发明电〔2025〕7 号）
 *
 * 使用方式：
 *   import { getHolidayEntry } from '@/config/holidays';
 *   const entry = getHolidayEntry('2026-10-01');
 *   // entry => { date: '2026-10-01', name: '国庆节', isOffDay: true }
 */

export interface HolidayEntry {
  date: string;          // YYYY-MM-DD
  name: string;          // 元旦 / 春节 / 清明节 / ...
  isOffDay: boolean;     // true=放假日, false=调休工作日
}

export const HOLIDAYS_2026: HolidayEntry[] = [
  { date: '2026-01-01', name: '元旦', isOffDay: true },
  { date: '2026-01-02', name: '元旦', isOffDay: true },
  { date: '2026-01-03', name: '元旦', isOffDay: true },
  { date: '2026-01-04', name: '元旦调休上班', isOffDay: false },

  { date: '2026-02-14', name: '春节调休上班', isOffDay: false },
  { date: '2026-02-15', name: '春节', isOffDay: true },
  { date: '2026-02-16', name: '春节', isOffDay: true },
  { date: '2026-02-17', name: '春节', isOffDay: true },
  { date: '2026-02-18', name: '春节', isOffDay: true },
  { date: '2026-02-19', name: '春节', isOffDay: true },
  { date: '2026-02-20', name: '春节', isOffDay: true },
  { date: '2026-02-21', name: '春节', isOffDay: true },
  { date: '2026-02-22', name: '春节', isOffDay: true },
  { date: '2026-02-23', name: '春节', isOffDay: true },
  { date: '2026-02-28', name: '春节调休上班', isOffDay: false },

  { date: '2026-04-04', name: '清明节', isOffDay: true },
  { date: '2026-04-05', name: '清明节', isOffDay: true },
  { date: '2026-04-06', name: '清明节', isOffDay: true },

  { date: '2026-05-01', name: '劳动节', isOffDay: true },
  { date: '2026-05-02', name: '劳动节', isOffDay: true },
  { date: '2026-05-03', name: '劳动节', isOffDay: true },
  { date: '2026-05-04', name: '劳动节', isOffDay: true },
  { date: '2026-05-05', name: '劳动节', isOffDay: true },
  { date: '2026-05-09', name: '劳动节调休上班', isOffDay: false },

  { date: '2026-06-19', name: '端午节', isOffDay: true },
  { date: '2026-06-20', name: '端午节', isOffDay: true },
  { date: '2026-06-21', name: '端午节', isOffDay: true },

  { date: '2026-09-20', name: '国庆节调休上班', isOffDay: false },
  { date: '2026-09-25', name: '中秋节', isOffDay: true },
  { date: '2026-09-26', name: '中秋节', isOffDay: true },
  { date: '2026-09-27', name: '中秋节', isOffDay: true },

  { date: '2026-10-01', name: '国庆节', isOffDay: true },
  { date: '2026-10-02', name: '国庆节', isOffDay: true },
  { date: '2026-10-03', name: '国庆节', isOffDay: true },
  { date: '2026-10-04', name: '国庆节', isOffDay: true },
  { date: '2026-10-05', name: '国庆节', isOffDay: true },
  { date: '2026-10-06', name: '国庆节', isOffDay: true },
  { date: '2026-10-07', name: '国庆节', isOffDay: true },
  { date: '2026-10-10', name: '国庆节调休上班', isOffDay: false },
];

export const HOLIDAY_MAP_2026 = new Map<string, HolidayEntry>(
  HOLIDAYS_2026.map((item) => [item.date, item])
);

export function getHolidayEntry(dateKey: string): HolidayEntry | null {
  return HOLIDAY_MAP_2026.get(dateKey) ?? null;
}
