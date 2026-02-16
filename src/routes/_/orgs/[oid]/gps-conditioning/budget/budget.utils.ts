import type { TrainingKeyEvent, WeeklyTrainingBudget } from '$lib/services/training-budget.service';
import { alignToWeekStart, getCalendarYearRange } from '$lib/utils/calendar.util';

export function groupEvents(list: TrainingKeyEvent[]) {
    return list.reduce<Record<string, TrainingKeyEvent[]>>((acc, event) => {
        if (!acc[event.eventDate]) acc[event.eventDate] = [];
        acc[event.eventDate].push(event);
        return acc;
    }, {});
}

export function mapBudgets(list: WeeklyTrainingBudget[] = []) {
    return Object.fromEntries(list.map((item) => [item.allocatedOn, item.budget.toString()]));
}

export function buildWeeks(
    year: number,
    weekStartsOn: number,
    startMonth: number,
    eventMap: Record<string, TrainingKeyEvent[]>,
    labelFormat: string,
    localeValue: string,
    todayIso: string
) {
    const { start, end } = getCalendarYearRange(year, startMonth, weekStartsOn);
    const startMonthIndex = start.year * 12 + (start.month - 1);
    let cursor = alignToWeekStart(start, weekStartsOn);
    const result: Array<{
        index: number;
        startIso: string;
        days: Array<{
            iso: string;
            label: string;
            isCurrentYear: boolean;
            isToday: boolean;
            events: TrainingKeyEvent[];
            isAltMonth: boolean;
        }>;
    }> = [];
    let index = 0;
    while (cursor < end) {
        const startIso = cursor.toISODate()!;
        const days = Array.from({ length: 7 }, (_, dayIndex) => {
            const date = cursor.plus({ days: dayIndex });
            const iso = date.toISODate()!;
            const monthIndex = date.year * 12 + (date.month - 1);
            const isAltMonth = (((monthIndex - startMonthIndex) % 2) + 2) % 2 === 1;
            return {
                iso,
                label: date.setLocale(localeValue).toFormat(labelFormat),
                isCurrentYear: date >= start && date < end,
                isToday: iso === todayIso,
                events: eventMap[iso] ?? [],
                isAltMonth,
            };
        });
        result.push({ index: index + 1, startIso, days });
        index += 1;
        cursor = cursor.plus({ weeks: 1 });
    }
    return result;
}

export const sanitizeInput = (value: string) =>
    value
        .replace(/\u00a0/g, ' ')
        .replace(/\r/g, '')
        .replace(/\n/g, '')
        .replace(/\t/g, ' ')
        .trim();

export const numericPattern = /^-?\d*(?:\.\d*)?$/;

export const isValidNumericInput = (value: string) => value === '' || numericPattern.test(value);

export function randomId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return Math.random().toString(16).slice(2);
}
