<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
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
		minimumDuration,
		calendarHeight,
		onvalidation,
		onedgenavigate,
		onzoom,
		onremoveslot,
		onupdateslot,
		onstartedit,
		editingSlotId = null
	}: {
		days: CalendarDay[];
		slots: CalendarSlot[];
		draft: DraftSlot | null;
		snapInterval: number;
		minimumDuration: number;
		calendarHeight: number;
		onvalidation: (message: string) => void;
		onedgenavigate: (direction: -1 | 1) => void;
		onzoom: (direction: -1 | 1) => void;
		onremoveslot: (slot: CalendarSlot) => Promise<boolean>;
		onupdateslot: (before: CalendarSlot, after: CalendarSlot) => Promise<void>;
		onstartedit: (slot: CalendarSlot) => void;
		editingSlotId?: string | null;
	} = $props();

	let interaction = $state<Interaction | null>(null);
	let gesture = $state<Gesture | null>(null);
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let pointerStartX = 0;
	let pointerStartY = 0;
	let interactionMoved = $state(false);
	let interactionOriginal: CalendarSlot | null = null;
	let calendarElement: HTMLElement;
	let lastEdgeNavigation = 0;
	let pendingCancellationId = $state<string | null>(null);
	const touchPoints = new SvelteMap<number, { x: number; y: number }>();
	let pinchDistance = 0;
	const labelInterval = $derived(calendarHeight / 24 >= 120 ? 15 : 30);
	const timeLabels = $derived(
		Array.from(
			{ length: MINUTES_PER_DAY / labelInterval - 1 },
			(_, index) => (index + 1) * labelInterval
		)
	);
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
		const maximumMinutes =
			interaction?.type === 'resize' && interaction.edge === 'end'
				? MINUTES_PER_DAY
				: MINUTES_PER_DAY - snapInterval;
		gesture = {
			...gesture,
			currentDate: date,
			currentMinutes: minutesFromPointer(event, day, snapInterval, maximumMinutes),
			fingerX: event.clientX,
			fingerY: event.clientY,
			constrained: false
		};
		return day;
	}

	function clampGestureTo(date: Date) {
		if (!gesture) return;
		const minutes = date.getHours() * 60 + date.getMinutes();
		const constrained =
			gesture.currentDate !== toDateKey(date) || gesture.currentMinutes !== minutes;
		gesture = {
			...gesture,
			currentDate: toDateKey(date),
			currentMinutes: minutes,
			constrained
		};
	}

	function handleDayPointerDown(event: PointerEvent, date: string, day: HTMLElement) {
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		if (draft) return;
		pointerStartX = event.clientX;
		pointerStartY = event.clientY;
		onvalidation('');
		if (event.pointerType === 'mouse') return beginCreate(event, date, day);
		clearLongPress();
		longPressTimer = setTimeout(() => beginCreate(event, date, day), 350);
	}

	function beginCreate(event: PointerEvent, date: string, day: HTMLElement) {
		const anchorMinutes = Math.min(
			minutesFromPointer(event, day, snapInterval),
			MINUTES_PER_DAY - minimumDuration
		);
		const start = dateAndMinutes(date, anchorMinutes);
		const candidate = candidateFromRange(
			start,
			new Date(start.getTime() + minimumDuration * 60_000)
		);
		const problem = validate(candidate);
		if (problem) return onvalidation(problem);
		clearLongPress();
		interaction = { type: 'create', pointerId: event.pointerId, anchorDate: date, anchorMinutes };
		interactionMoved = true;
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
		if (event.pointerType === 'touch' && touchPoints.has(event.pointerId)) {
			touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
			if (touchPoints.size >= 2) {
				const [first, second] = [...touchPoints.values()];
				const distance = Math.hypot(first.x - second.x, first.y - second.y);
				if (Math.abs(distance - pinchDistance) >= 12) {
					zoomAround(distance > pinchDistance ? 1 : -1, (first.y + second.y) / 2);
					pinchDistance = distance;
				}
				event.preventDefault();
				return;
			}
		}
		if (!interaction && longPressTimer) {
			if (Math.hypot(event.clientX - pointerStartX, event.clientY - pointerStartY) > 10)
				clearLongPress();
			return;
		}
		if (!interaction || interaction.pointerId !== event.pointerId) return;
		if (
			interaction.type !== 'create' &&
			!interactionMoved &&
			Math.hypot(event.clientX - pointerStartX, event.clientY - pointerStartY) < 9
		)
			return;
		interactionMoved = true;
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
			const minimum = minimumDuration * 60_000;
			const interval = snapInterval * 60_000;
			const draggingUp = pointer < anchor;
			let start = new Date(draggingUp ? pointer.getTime() : anchor.getTime());
			let end = new Date(
				draggingUp
					? Math.max(anchor.getTime() + interval, pointer.getTime() + minimum)
					: Math.max(pointer.getTime() + interval, anchor.getTime() + minimum)
			);
			const earliest = earliestLegalStart().getTime();
			if (start.getTime() < earliest) start = new Date(earliest);
			if (end.getTime() < start.getTime() + minimum) end = new Date(start.getTime() + minimum);
			applyCandidate('draft', candidateFromRange(start, end));
			return;
		}

		if (interaction.type === 'move') {
			const pointer = dateAndMinutes(date, minutesFromPointer(event, targetDay, snapInterval));
			const dayEnd = dateAndMinutes(date, MINUTES_PER_DAY).getTime();
			const earliest = earliestLegalStart().getTime();
			const latest = dayEnd - interaction.durationMinutes * 60_000;
			const start = new Date(
				Math.min(
					Math.max(pointer.getTime() - interaction.offsetMinutes * 60_000, earliest),
					Math.max(earliest, latest)
				)
			);
			const end = new Date(start.getTime() + interaction.durationMinutes * 60_000);
			clampGestureTo(new Date(start.getTime() + interaction.offsetMinutes * 60_000));
			applyCandidate(interaction.slotId, candidateFromRange(start, end));
			return;
		}

		const slot = getInteractionSlot(interaction.slotId);
		if (!slot) return;
		const pointer = dateAndMinutes(
			date,
			minutesFromPointer(
				event,
				targetDay,
				snapInterval,
				interaction.edge === 'end' ? MINUTES_PER_DAY : MINUTES_PER_DAY - snapInterval
			)
		);
		const minimum = minimumDuration * 60_000;
		const start = rangeStart(slot);
		const end = rangeEnd(slot);
		if (interaction.edge === 'start') {
			const resizedStart = new Date(
				Math.max(
					earliestLegalStart().getTime(),
					Math.min(pointer.getTime(), end.getTime() - minimum)
				)
			);
			if (resizedStart.getTime() !== pointer.getTime()) clampGestureTo(resizedStart);
			applyCandidate(interaction.slotId, candidateFromRange(resizedStart, end));
		} else {
			const resizedEnd = new Date(Math.max(pointer.getTime(), start.getTime() + minimum));
			if (resizedEnd.getTime() !== pointer.getTime()) clampGestureTo(resizedEnd);
			applyCandidate(interaction.slotId, candidateFromRange(start, resizedEnd));
		}
	}

	function trackPointerDown(event: PointerEvent) {
		if (event.pointerType !== 'touch') return;
		touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
		if (touchPoints.size < 2) return;
		clearLongPress();
		clearInteraction();
		const [first, second] = [...touchPoints.values()];
		pinchDistance = Math.hypot(first.x - second.x, first.y - second.y);
	}

	function releasePointer(event: PointerEvent) {
		touchPoints.delete(event.pointerId);
		finish(event);
	}

	function handleWheel(event: WheelEvent) {
		if (!event.ctrlKey) return;
		event.preventDefault();
		zoomAround(event.deltaY < 0 ? 1 : -1, event.clientY);
	}

	function zoomAround(direction: -1 | 1, clientY: number) {
		const rect = calendarElement.getBoundingClientRect();
		const focalY = Math.min(Math.max(clientY - rect.top, 0), rect.height);
		const oldScrollHeight = calendarElement.scrollHeight;
		const focalRatio = (calendarElement.scrollTop + focalY) / oldScrollHeight;
		onzoom(direction);
		requestAnimationFrame(() => {
			calendarElement.scrollTop = focalRatio * calendarElement.scrollHeight - focalY;
		});
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
		pointerStartX = event.clientX;
		pointerStartY = event.clientY;
		interactionMoved = false;
		interactionOriginal = 'id' in slot ? snapshotSlot(slot) : null;
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

	function beginEditMove(event: PointerEvent, slot: CalendarSlot, element: HTMLElement) {
		onstartedit(slot);
		beginMove(event, draftFromSlot(slot), 'draft', element);
	}

	function beginEditResize(event: PointerEvent, slot: CalendarSlot, edge: 'start' | 'end') {
		onstartedit(slot);
		beginResize(event, draftFromSlot(slot), 'draft', edge);
	}

	function draftFromSlot(slot: CalendarSlot): DraftSlot {
		return {
			date: slot.date,
			endDate: slot.endDate,
			startMinutes: slot.startMinutes,
			endMinutes: slot.endMinutes,
			status: slot.status,
			remote: slot.remote,
			remoteIds: slot.remoteIds ? [...slot.remoteIds] : undefined
		};
	}

	function snapshotSlot(slot: CalendarSlot): CalendarSlot {
		return { id: slot.id, label: slot.label, ...draftFromSlot(slot) };
	}

	function beginResize(
		event: PointerEvent,
		slot: CalendarSlot | DraftSlot,
		id: string,
		edge: 'start' | 'end'
	) {
		event.stopPropagation();
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		pointerStartX = event.clientX;
		pointerStartY = event.clientY;
		interactionMoved = false;
		interactionOriginal = 'id' in slot ? snapshotSlot(slot) : null;
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
		const problem = validate(candidate, id === 'draft' ? (editingSlotId ?? undefined) : id);
		if (problem) {
			if (interaction?.type === 'move' || interaction?.type === 'resize') return;
			return onvalidation(problem);
		}
		onvalidation('');
		if (id === 'draft') draft = candidate;
		else slots = updateSlot(slots, id, candidate);
	}

	function validate(candidate: DraftSlot, ignoredSlotId?: string) {
		const candidateStart = rangeStart(candidate);
		const candidateEnd = rangeEnd(candidate);
		if (candidateEnd <= candidateStart) return 'The slot must have a duration.';
		if ((candidateEnd.getTime() - candidateStart.getTime()) / 60_000 < minimumDuration)
			return `Your campus requires slots of at least ${minimumDuration} minutes.`;
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
		const completedInteraction = interaction;
		const moved = interactionMoved;
		const original = interactionOriginal;
		const updated =
			'slotId' in completedInteraction
				? slots.find((slot) => slot.id === completedInteraction.slotId)
				: undefined;
		if (calendarElement.hasPointerCapture(event.pointerId))
			calendarElement.releasePointerCapture(event.pointerId);
		clearInteraction();
		if (moved && original && updated && rangeChanged(original, updated)) {
			void onupdateslot(original, updated);
		}
	}

	function rangeChanged(before: CalendarSlot, after: CalendarSlot): boolean {
		return (
			rangeStart(before).getTime() !== rangeStart(after).getTime() ||
			rangeEnd(before).getTime() !== rangeEnd(after).getTime()
		);
	}

	function clearInteraction() {
		interaction = null;
		gesture = null;
		interactionMoved = false;
		interactionOriginal = null;
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
		if (slot) void removeExistingSlot(slot);
		else removeSlotImmediately(id);
	}

	async function removeExistingSlot(slot: CalendarSlot) {
		if (await onremoveslot(slot)) removeSlotImmediately(slot.id);
	}

	function removeSlotImmediately(id: string) {
		if (id === 'draft') draft = null;
		else slots = slots.filter((slot) => slot.id !== id);
		if (interaction && 'slotId' in interaction && interaction.slotId === id) clearInteraction();
	}

	async function confirmCancellation() {
		const slot = slots.find((item) => item.id === pendingCancellationId);
		if (slot) await removeExistingSlot(slot);
		pendingCancellationId = null;
	}

	function isSlotPast(slot: CalendarSlot) {
		return rangeEnd(slot).getTime() < Date.now();
	}
	function startsAtLegalBoundary(slot: DraftSlot | CalendarSlot) {
		return rangeStart(slot).getTime() === earliestLegalStart().getTime();
	}
	function earliestStartTop(date: string) {
		const now = new Date();
		if (date !== toDateKey(now)) return null;
		const earliest = earliestLegalStart();
		return slotTop(earliest.getHours() * 60 + earliest.getMinutes());
	}
	function formatTimeLabel(minutes: number) {
		const hour = Math.floor(minutes / 60);
		const minute = minutes % 60;
		return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
	}
</script>

<div
	class="calendar"
	class:single-day={days.length === 1}
	bind:this={calendarElement}
	role="region"
	aria-label="Availability calendar"
	style={`--day-count:${days.length};--calendar-height:${calendarHeight}px`}
	onpointermove={handleCalendarPointerMove}
	onpointerdown={trackPointerDown}
	onpointerup={releasePointer}
	onpointercancel={releasePointer}
	onlostpointercapture={releasePointer}
	onwheel={handleWheel}
>
	<div class="corner"></div>
	{#each days as day (day.date)}<header>
			<strong>{day.label}</strong><span>{day.displayDate}</span>
		</header>{/each}
	<div class="times" style={`height:${calendarHeight}px`}>
		{#each timeLabels as minutes (minutes)}<span style={`top:${slotTop(minutes)}%`}
				>{formatTimeLabel(minutes)}</span
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
			{#each timeLabels as minutes (minutes)}<div
					class="hour-line"
					class:minor-line={minutes % 60 !== 0}
					style={`top:${slotTop(minutes)}%`}
				></div>{/each}
			{#if earliestStartTop(day.date) !== null}<div
					class="past-overlay"
					style={`height:${earliestStartTop(day.date)}%`}
				></div>{/if}
			{#each (slotsByDate.get(day.date) ?? []).toSorted((a, b) => a.startMinutes - b.startMinutes) as segment (`${segment.slot.id}-${day.date}`)}
				{#if segment.slot.id !== editingSlotId}
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
						boundaryGap={segment.isStart && startsAtLegalBoundary(segment.slot)}
						showStartHandle={segment.isStart}
						showEndHandle={segment.isEnd}
						onmove={(event, element) => beginEditMove(event, segment.slot, element)}
						onresize={(event, edge) => beginEditResize(event, segment.slot, edge)}
						onremove={() => removeSlot(segment.slot.id)}
					/>
				{/if}
			{/each}
			{#if earliestStartTop(day.date) !== null}<div
					class="current-time"
					style={`top:${earliestStartTop(day.date)}%`}
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
						boundaryGap={draftSegment.isStart && startsAtLegalBoundary(draft)}
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

{#if gesture && !gesture.constrained && gesture.pointerType !== 'mouse' && (interaction?.type === 'create' || interactionMoved)}
	<TimeLoupe {gesture} />
{/if}
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
		border: 1px solid var(--border);
		border-radius: 0.25rem;
		background: var(--base);
	}
	.corner,
	header {
		position: sticky;
		top: 0;
		z-index: 8;
		border-bottom: 1px solid var(--border);
		background: var(--surface);
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
		color: var(--muted);
		font-size: 0.72rem;
	}
	.times {
		position: sticky;
		left: 0;
		z-index: 6;
		border-right: 1px solid var(--border);
		background: var(--surface-muted);
	}
	.times span {
		position: absolute;
		left: 0;
		z-index: 2;
		width: 100%;
		padding: 0 0.25rem;
		transform: translateY(-50%);
		color: var(--muted);
		font-size: 0.65rem;
		font-variant-numeric: tabular-nums;
		text-align: center;
	}
	.day {
		position: relative;
		border-right: 1px solid var(--grid);
		touch-action: pan-y;
		user-select: none;
		background: var(--base);
	}
	.day.dragging {
		cursor: ns-resize;
		touch-action: none;
	}
	.hour-line {
		position: absolute;
		left: 0;
		right: 0;
		z-index: 2;
		border-top: 1px solid var(--grid);
		pointer-events: none;
	}
	.hour-line.minor-line {
		opacity: 0.5;
	}
	.past-overlay {
		position: absolute;
		inset: 0 0 auto;
		z-index: 4;
		background: var(--overlay);
		box-shadow: inset 0 -1px 0 var(--border);
		pointer-events: none;
	}
	.current-time {
		position: absolute;
		left: 0;
		right: 0;
		z-index: 5;
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
			grid-template-columns: 3.75rem repeat(var(--day-count), minmax(0, 1fr));
			height: calc(100dvh - 4.25rem);
		}
		:global(main.has-draft) .calendar {
			height: calc(100dvh - 7rem);
		}
		.calendar.single-day .corner {
			display: none;
		}
		.calendar.single-day header {
			grid-column: 1 / -1;
		}
	}
</style>
