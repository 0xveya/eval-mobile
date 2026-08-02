import { MINUTES_PER_DAY, type CalendarSlot, type DraftSlot } from './calendar-types';

export function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

export function snapMinutes(value: number, interval: number) {
	return Math.round(value / interval) * interval;
}

export function overlaps(
	a: Pick<DraftSlot, 'startMinutes' | 'endMinutes'>,
	b: Pick<DraftSlot, 'startMinutes' | 'endMinutes'>
) {
	return a.startMinutes < b.endMinutes && a.endMinutes > b.startMinutes;
}

export function moveSlot(slot: Pick<DraftSlot, 'startMinutes' | 'endMinutes'>, newStart: number) {
	const duration = slot.endMinutes - slot.startMinutes;
	return { startMinutes: newStart, endMinutes: newStart + duration };
}

export function resizeSlot(
	slot: DraftSlot,
	edge: 'start' | 'end',
	minutes: number,
	minimumDuration: number
): DraftSlot {
	return edge === 'start'
		? { ...slot, startMinutes: Math.min(minutes, slot.endMinutes - minimumDuration) }
		: { ...slot, endMinutes: Math.max(minutes, slot.startMinutes + minimumDuration) };
}

export function updateSlot(
	slots: CalendarSlot[],
	id: string,
	update: Partial<CalendarSlot>
): CalendarSlot[] {
	return slots.map((slot) => (slot.id === id ? { ...slot, ...update } : slot));
}

export function slotTop(minutes: number) {
	return (minutes / MINUTES_PER_DAY) * 100;
}

export function slotHeight(startMinutes: number, endMinutes: number) {
	return ((endMinutes - startMinutes) / MINUTES_PER_DAY) * 100;
}

export function formatMinutes(minutes: number) {
	if (minutes === MINUTES_PER_DAY) return '24:00';
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function minutesFromPointer(event: PointerEvent, element: HTMLElement, interval: number) {
	const rect = element.getBoundingClientRect();
	const y = clamp(event.clientY - rect.top, 0, rect.height);
	const rawMinutes = (y / rect.height) * MINUTES_PER_DAY;
	return clamp(snapMinutes(rawMinutes, interval), 0, MINUTES_PER_DAY - interval);
}

export function startOfDay(date: Date) {
	const copy = new Date(date);
	copy.setHours(0, 0, 0, 0);
	return copy;
}

export function addDays(date: Date, amount: number) {
	const copy = new Date(date);
	copy.setDate(copy.getDate() + amount);
	return copy;
}

export function toDateKey(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function dateAndMinutes(date: string, minutes: number) {
	const value = new Date(`${date}T00:00:00`);
	value.setMinutes(minutes);
	return value;
}
