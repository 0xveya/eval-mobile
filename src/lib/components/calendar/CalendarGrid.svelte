<script lang="ts">
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import SlotBlock from './SlotBlock.svelte';
	import TimeLoupe from './TimeLoupe.svelte';
	import {
		dateAndMinutes,
		minutesFromPointer,
		slotTop,
		toDateKey,
		updateSlot
	} from './calendar-math';
	import {
		MINUTES_PER_DAY,
		type CalendarDay,
		type CalendarSlot,
		type DraftSlot,
		type Gesture,
		type Interaction
	} from './calendar-types';

	let {
		days,
		slots = $bindable(),
		draft = $bindable(),
		snapInterval,
		calendarHeight,
		onvalidation,
		onedgenavigate
	}: {
		days: CalendarDay[];
		slots: CalendarSlot[];
		draft: DraftSlot | null;
		snapInterval: number;
		calendarHeight: number;
		onvalidation: (message: string) => void;
		onedgenavigate: (direction: -1 | 1) => void;
	} = $props();

	let interaction = $state<Interaction | null>(null);
	let gesture = $state<Gesture | null>(null);
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let pointerStartX = 0;
	let pointerStartY = 0;
	let calendarElement: HTMLElement;
	let lastEdgeNavigation = 0;
	let pendingCancellationId = $state<string | null>(null);
	const hourLabels = Array.from({ length: 25 }, (_, hour) => hour);
	type SlotSegment = {
		slot: CalendarSlot;
		startMinutes: number;
		endMinutes: number;
		isStart: boolean;
		isEnd: boolean;
	};
	const slotsByDate = $derived(
		days.reduce((map, day) => {
			const group = slots
				.map((slot) => segmentForDay(slot, day.date))
				.filter((segment): segment is SlotSegment => segment !== null);
			map.set(day.date, group);
			return map;
		}, new Map<string, SlotSegment[]>())
	);

	function rangeStart(slot: DraftSlot | CalendarSlot) {
		return dateAndMinutes(slot.date, slot.startMinutes);
	}

	function rangeEnd(slot: DraftSlot | CalendarSlot) {
		return dateAndMinutes(slot.endDate ?? slot.date, slot.endMinutes);
	}

	function candidateFromRange(start: Date, end: Date): DraftSlot {
		return {
			date: toDateKey(start),
			endDate: toDateKey(end),
			startMinutes: start.getHours() * 60 + start.getMinutes(),
			endMinutes: end.getHours() * 60 + end.getMinutes()
		};
	}

	function earliestLegalStart() {
		const interval = snapInterval * 60_000;
		return new Date(Math.ceil(Date.now() / interval) * interval);
	}

	function segmentForDay(slot: CalendarSlot, date: string): SlotSegment | null {
		const dayStart = dateAndMinutes(date, 0);
		const dayEnd = dateAndMinutes(date, MINUTES_PER_DAY);
		const start = rangeStart(slot);
		const end = rangeEnd(slot);
		if (start >= dayEnd || end <= dayStart) return null;
		return {
			slot,
			startMinutes: start > dayStart ? slot.startMinutes : 0,
			endMinutes: end < dayEnd ? slot.endMinutes : MINUTES_PER_DAY,
			isStart: slot.date === date,
			isEnd: (slot.endDate ?? slot.date) === date
		};
	}

	function draftSegmentForDay(date: string) {
		if (!draft) return null;
		const segment = segmentForDay({ id: 'draft', label: 'Draft', ...draft }, date);
		return segment;
	}

	function dayAtPoint(event: PointerEvent) {
		return (
			document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('.day') ?? null
		);
	}

	function updateGesture(event: PointerEvent) {
		if (!gesture) return null;
		const day = dayAtPoint(event);
		if (!day) {
			gesture = { ...gesture, fingerX: event.clientX, fingerY: event.clientY };
			return null;
		}
		const date = day.dataset.date;
		if (!date) return null;
		gesture = {
			...gesture,
			currentDate: date,
			currentMinutes: minutesFromPointer(event, day, snapInterval),
			fingerX: event.clientX,
			fingerY: event.clientY
		};
		return day;
	}

	function handleDayPointerDown(event: PointerEvent, date: string, day: HTMLElement) {
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		pointerStartX = event.clientX;
		pointerStartY = event.clientY;
		onvalidation('');
		if (event.pointerType === 'mouse') return beginCreate(event, date, day);
		clearLongPress();
		longPressTimer = setTimeout(() => beginCreate(event, date, day), 350);
	}

	function beginCreate(event: PointerEvent, date: string, day: HTMLElement) {
		const anchorMinutes = minutesFromPointer(event, day, snapInterval);
		const start = dateAndMinutes(date, anchorMinutes);
		const candidate = candidateFromRange(start, new Date(start.getTime() + snapInterval * 60_000));
		const problem = validate(candidate);
		if (problem) return onvalidation(problem);
		clearLongPress();
		interaction = { type: 'create', pointerId: event.pointerId, anchorDate: date, anchorMinutes };
		gesture = {
			pointerId: event.pointerId,
			pointerType: event.pointerType,
			mode: 'create',
			anchorDate: date,
			anchorMinutes,
			currentDate: date,
			currentMinutes: anchorMinutes,
			fingerX: event.clientX,
			fingerY: event.clientY
		};
		draft = candidate;
		calendarElement.setPointerCapture(event.pointerId);
	}

	function handleCalendarPointerMove(event: PointerEvent) {
		if (!interaction && longPressTimer) {
			if (Math.hypot(event.clientX - pointerStartX, event.clientY - pointerStartY) > 10)
				clearLongPress();
			return;
		}
		if (!interaction || interaction.pointerId !== event.pointerId) return;
		event.preventDefault();
		autoScroll(event);
		navigateAtEdge(event);
		const targetDay = updateGesture(event);
		if (!targetDay) return;
		const date = targetDay.dataset.date;
		if (!date) return;

		if (interaction.type === 'create') {
			const pointerMinutes = minutesFromPointer(event, targetDay, snapInterval);
			const anchor = dateAndMinutes(interaction.anchorDate, interaction.anchorMinutes);
			const pointer = dateAndMinutes(date, pointerMinutes);
			const start = new Date(
				Math.max(Math.min(anchor.getTime(), pointer.getTime()), earliestLegalStart().getTime())
			);
			const end = new Date(Math.max(anchor.getTime(), pointer.getTime()) + snapInterval * 60_000);
			applyCandidate('draft', candidateFromRange(start, end));
			return;
		}

		if (interaction.type === 'move') {
			const pointer = dateAndMinutes(date, minutesFromPointer(event, targetDay, snapInterval));
			const start = new Date(
				Math.max(
					pointer.getTime() - interaction.offsetMinutes * 60_000,
					earliestLegalStart().getTime()
				)
			);
			const end = new Date(start.getTime() + interaction.durationMinutes * 60_000);
			applyCandidate(interaction.slotId, candidateFromRange(start, end));
			return;
		}

		const slot = getInteractionSlot(interaction.slotId);
		if (!slot) return;
		const pointer = dateAndMinutes(date, minutesFromPointer(event, targetDay, snapInterval));
		const minimum = snapInterval * 60_000;
		const start = rangeStart(slot);
		const end = rangeEnd(slot);
		if (interaction.edge === 'start') {
			applyCandidate(
				interaction.slotId,
				candidateFromRange(
					new Date(
						Math.max(
							earliestLegalStart().getTime(),
							Math.min(pointer.getTime(), end.getTime() - minimum)
						)
					),
					end
				)
			);
		} else {
			applyCandidate(
				interaction.slotId,
				candidateFromRange(start, new Date(Math.max(pointer.getTime(), start.getTime() + minimum)))
			);
		}
	}

	function autoScroll(event: PointerEvent) {
		const rect = calendarElement.getBoundingClientRect();
		const edgeSize = 56;
		if (event.clientY < rect.top + edgeSize) calendarElement.scrollTop -= 18;
		else if (event.clientY > rect.bottom - edgeSize) calendarElement.scrollTop += 18;
	}

	function navigateAtEdge(event: PointerEvent) {
		const rect = calendarElement.getBoundingClientRect();
		const now = Date.now();
		if (now - lastEdgeNavigation < 600) return;
		let direction: -1 | 1 | null = null;
		if (event.clientX <= rect.left + 24) direction = -1;
		else if (event.clientX >= rect.right - 24) direction = 1;
		if (!direction) return;
		lastEdgeNavigation = now;
		onedgenavigate(direction);
	}

	function beginMove(
		event: PointerEvent,
		slot: CalendarSlot | DraftSlot,
		id: string,
		element: HTMLElement
	) {
		event.stopPropagation();
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		const day = element.parentElement as HTMLElement;
		const pointerMinutes = minutesFromPointer(event, day, snapInterval);
		const pointerDate = dateAndMinutes(day.dataset.date ?? slot.date, pointerMinutes);
		const start = rangeStart(slot);
		const end = rangeEnd(slot);
		interaction = {
			type: 'move',
			pointerId: event.pointerId,
			slotId: id,
			offsetMinutes: (pointerDate.getTime() - start.getTime()) / 60_000,
			durationMinutes: (end.getTime() - start.getTime()) / 60_000
		};
		gesture = {
			pointerId: event.pointerId,
			pointerType: event.pointerType,
			mode: 'move',
			anchorDate: slot.date,
			anchorMinutes: slot.startMinutes,
			currentDate: slot.date,
			currentMinutes: pointerMinutes,
			fingerX: event.clientX,
			fingerY: event.clientY,
			slotId: id
		};
		onvalidation('');
		calendarElement.setPointerCapture(event.pointerId);
	}

	function beginResize(
		event: PointerEvent,
		slot: CalendarSlot | DraftSlot,
		id: string,
		edge: 'start' | 'end'
	) {
		event.stopPropagation();
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		interaction = { type: 'resize', pointerId: event.pointerId, slotId: id, edge };
		const edgeDate = edge === 'start' ? slot.date : (slot.endDate ?? slot.date);
		const minutes = edge === 'start' ? slot.startMinutes : slot.endMinutes;
		gesture = {
			pointerId: event.pointerId,
			pointerType: event.pointerType,
			mode: edge === 'start' ? 'resize-start' : 'resize-end',
			anchorDate: edgeDate,
			anchorMinutes: minutes,
			currentDate: edgeDate,
			currentMinutes: minutes,
			fingerX: event.clientX,
			fingerY: event.clientY,
			slotId: id
		};
		onvalidation('');
		calendarElement.setPointerCapture(event.pointerId);
	}

	function getInteractionSlot(id: string): DraftSlot | CalendarSlot | null {
		if (id === 'draft') return draft;
		return slots.find((slot) => slot.id === id) ?? null;
	}

	function applyCandidate(id: string, candidate: DraftSlot) {
		const problem = validate(candidate, id === 'draft' ? undefined : id);
		if (problem) return onvalidation(problem);
		onvalidation('');
		if (id === 'draft') draft = candidate;
		else slots = updateSlot(slots, id, candidate);
	}

	function validate(candidate: DraftSlot, ignoredSlotId?: string) {
		const candidateStart = rangeStart(candidate);
		const candidateEnd = rangeEnd(candidate);
		if (candidateEnd <= candidateStart) return 'The slot must have a duration.';
		if (candidateStart.getTime() < Date.now()) return 'You cannot open a slot in the past.';
		if (
			slots.some(
				(slot) =>
					slot.id !== ignoredSlotId &&
					candidateStart < rangeEnd(slot) &&
					candidateEnd > rangeStart(slot)
			)
		)
			return 'That time overlaps an existing slot.';
		return null;
	}

	function finish(event: PointerEvent) {
		if (!interaction || interaction.pointerId !== event.pointerId) return;
		if (calendarElement.hasPointerCapture(event.pointerId))
			calendarElement.releasePointerCapture(event.pointerId);
		clearInteraction();
	}

	function clearInteraction() {
		interaction = null;
		gesture = null;
		clearLongPress();
	}

	function clearLongPress() {
		if (longPressTimer) clearTimeout(longPressTimer);
		longPressTimer = null;
	}

	function removeSlot(id: string) {
		const slot = slots.find((item) => item.id === id);
		if (slot?.status === 'booked') {
			pendingCancellationId = id;
			return;
		}
		removeSlotImmediately(id);
	}

	function removeSlotImmediately(id: string) {
		if (id === 'draft') draft = null;
		else slots = slots.filter((slot) => slot.id !== id);
		if (interaction && 'slotId' in interaction && interaction.slotId === id) clearInteraction();
	}

	function confirmCancellation() {
		if (pendingCancellationId) removeSlotImmediately(pendingCancellationId);
		pendingCancellationId = null;
	}

	function isSlotPast(slot: CalendarSlot) {
		return rangeEnd(slot).getTime() < Date.now();
	}
	function currentTimeTop(date: string) {
		const now = new Date();
		return date === toDateKey(now) ? slotTop(now.getHours() * 60 + now.getMinutes()) : null;
	}
</script>

<div
	class="calendar"
	bind:this={calendarElement}
	role="region"
	aria-label="Availability calendar"
	style={`--day-count:${days.length};--calendar-height:${calendarHeight}px`}
	onpointermove={handleCalendarPointerMove}
	onpointerup={finish}
	onpointercancel={clearInteraction}
	onlostpointercapture={clearInteraction}
>
	<div class="corner"></div>
	{#each days as day (day.date)}<header>
			<strong>{day.label}</strong><span>{day.displayDate}</span>
		</header>{/each}
	<div class="times" style={`height:${calendarHeight}px`}>
		{#each hourLabels as hour (hour)}<span style={`top:${(hour / 24) * 100}%`}
				>{String(hour).padStart(2, '0')}:00</span
			>{/each}
	</div>
	{#each days as day (day.date)}
		<div
			class="day"
			class:dragging={interaction !== null}
			data-date={day.date}
			style={`height:${calendarHeight}px`}
			role="application"
			aria-label={`Availability for ${day.date}`}
			onpointerdown={(event) => handleDayPointerDown(event, day.date, event.currentTarget)}
		>
			{#each hourLabels as hour (hour)}<div
					class="hour-line"
					style={`top:${(hour / 24) * 100}%`}
				></div>{/each}
			{#if day.date === toDateKey(new Date())}<div
					class="past-overlay"
					style={`height:${slotTop(new Date().getHours() * 60 + new Date().getMinutes())}%`}
				></div>{/if}
			{#each (slotsByDate.get(day.date) ?? []).toSorted((a, b) => a.startMinutes - b.startMinutes) as segment (`${segment.slot.id}-${day.date}`)}
				<SlotBlock
					slot={{
						...segment.slot,
						date: day.date,
						startMinutes: segment.startMinutes,
						endMinutes: segment.endMinutes
					}}
					id={segment.slot.id}
					past={isSlotPast(segment.slot)}
					locked={segment.slot.status === 'booked'}
					showStartHandle={segment.isStart}
					showEndHandle={segment.isEnd}
					onmove={(event, element) => beginMove(event, segment.slot, segment.slot.id, element)}
					onresize={(event, edge) => beginResize(event, segment.slot, segment.slot.id, edge)}
					onremove={() => removeSlot(segment.slot.id)}
				/>
			{/each}
			{#if currentTimeTop(day.date) !== null}<div
					class="current-time"
					style={`top:${currentTimeTop(day.date)}%`}
				></div>{/if}
			{#if draft}
				{@const draftSegment = draftSegmentForDay(day.date)}
				{#if draftSegment}<SlotBlock
						slot={{
							...draft,
							date: day.date,
							startMinutes: draftSegment.startMinutes,
							endMinutes: draftSegment.endMinutes
						}}
						id="draft"
						draft
						showStartHandle={draftSegment.isStart}
						showEndHandle={draftSegment.isEnd}
						onmove={(event, element) => beginMove(event, draft!, 'draft', element)}
						onresize={(event, edge) => beginResize(event, draft!, 'draft', edge)}
						onremove={() => removeSlot('draft')}
					/>{/if}
			{/if}
		</div>
	{/each}
</div>

{#if gesture && gesture.pointerType !== 'mouse'}<TimeLoupe {gesture} />{/if}
{#if pendingCancellationId}
	<ConfirmDialog
		title="Cancel evaluation?"
		message="This removes the booked evaluation from your calendar."
		confirmLabel="Cancel evaluation"
		onconfirm={confirmCancellation}
		oncancel={() => (pendingCancellationId = null)}
	/>
{/if}

<style>
	.calendar {
		display: grid;
		grid-template-columns: 3.75rem repeat(var(--day-count), minmax(8rem, 1fr));
		grid-template-rows: auto var(--calendar-height);
		height: calc(100dvh - 5rem);
		overflow: auto;
		border: 1px solid #d2cfc6;
		border-radius: 0.25rem;
		background: #fff;
	}
	.corner,
	header {
		position: sticky;
		top: 0;
		z-index: 8;
		border-bottom: 1px solid #d2cfc6;
		background: #fff;
	}
	header {
		display: grid;
		padding: 0.55rem 0.35rem;
		text-align: center;
	}
	header strong {
		font-size: 0.78rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	header span {
		color: #777269;
		font-size: 0.72rem;
	}
	.times {
		position: sticky;
		left: 0;
		z-index: 6;
		border-right: 1px solid #d2cfc6;
		background: #faf9f5;
	}
	.times span {
		position: absolute;
		right: 0.35rem;
		transform: translateY(-50%);
		color: #777269;
		font-size: 0.65rem;
		font-variant-numeric: tabular-nums;
	}
	.day {
		position: relative;
		border-right: 1px solid #e1ded6;
		touch-action: pan-y;
		user-select: none;
		background: #fff;
	}
	.day.dragging {
		cursor: ns-resize;
		touch-action: none;
	}
	.hour-line {
		position: absolute;
		left: 0;
		right: 0;
		border-top: 1px solid #e4e1d9;
		pointer-events: none;
	}
	.past-overlay {
		position: absolute;
		inset: 0 0 auto;
		z-index: 1;
		background: rgb(59 54 46 / 5%);
		pointer-events: none;
	}
	.current-time {
		position: absolute;
		left: 0;
		right: 0;
		z-index: 2;
		border-top: 2px solid #e15a32;
		pointer-events: none;
	}
	.current-time::before {
		content: '';
		position: absolute;
		left: -0.25rem;
		top: -0.3rem;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: #e15a32;
	}
	@media (max-width: 520px) {
		.calendar {
			grid-template-columns: 3.25rem repeat(var(--day-count), minmax(0, 1fr));
			height: calc(100dvh - 7rem);
		}
	}
</style>
