import { DateTime } from 'luxon';

export const getCalendarYearStart = (year: number, startMonth: number) =>
	DateTime.fromObject({ year, month: startMonth, day: 1 }).startOf('day');

export const getCalendarYearRange = (
	year: number,
	startMonth: number,
	weekStartsOn: number
) => {
	const startOfYear = getCalendarYearStart(year, startMonth);
	const start = alignToWeekStart(startOfYear, weekStartsOn);

	const nextYearStart = getCalendarYearStart(year + 1, startMonth);
	const end = alignToWeekStart(nextYearStart, weekStartsOn).plus({ weeks: 1 });

	return { start, end };
};

export const alignToWeekStart = (date: DateTime, weekStartsOn: number) => {
	const targetWeekdayIndex = ((weekStartsOn % 7) + 7) % 7; // 0=Mon
	let cursor = date;
	while (((cursor.weekday + 6) % 7) !== targetWeekdayIndex) {
		cursor = cursor.minus({ days: 1 });
	}
	return cursor.startOf('day');
};
