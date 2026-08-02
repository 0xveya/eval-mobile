export const MINUTES_PER_DAY = 24 * 60;

export type CalendarSlot = {
	id: string;
	date: string;
	endDate?: string;
	startMinutes: number;
	endMinutes: number;
	label: string;
	status?: 'open' | 'booked';
	remote?: boolean;
	remoteIds?: number[];
};

export type DraftSlot = Omit<CalendarSlot, 'id' | 'label'>;

export type CalendarDay = {
	date: string;
	label: string;
	displayDate: string;
};

export type DayLayout = 'auto' | 1 | 2 | 3;

export type Interaction =
	| {
			type: 'create';
			pointerId: number;
			anchorDate: string;
			anchorMinutes: number;
	  }
	| {
			type: 'move';
			pointerId: number;
			slotId: string;
			offsetMinutes: number;
			durationMinutes: number;
	  }
	| {
			type: 'resize';
			pointerId: number;
			slotId: string;
			edge: 'start' | 'end';
	  };

export type Gesture = {
	pointerId: number;
	pointerType: string;
	mode: 'create' | 'move' | 'resize-start' | 'resize-end';
	anchorDate: string;
	anchorMinutes: number;
	currentDate: string;
	currentMinutes: number;
	fingerX: number;
	fingerY: number;
	slotId?: string;
};
