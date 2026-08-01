<script lang="ts">
	import { onMount } from 'svelte';
	import { getOpenSlots } from '$lib/remote/slots.remote';

	type CalendarSlot = {
		id: string;
		date: string;
		startMinutes: number;
		endMinutes: number;
		label: string;
	};

	type DraftSlot = {
		date: string;
		startMinutes: number;
		endMinutes: number;
	};

	const MINUTES_PER_DAY = 60 * 24;

	let visibleDayCount = $state(3);
	let snapMinutes = $state(15);
	let pixelsPerHour = $state(70);
	let startDate = $state(startOfDay(new Date()));

	let draft = $state<DraftSlot | null>(null);
	let dragging = $state(false);
	let movingSlotId = $state<string | null>(null);
	let moveMode = $state<'move' | 'resize-top' | 'resize-bottom' | null>(null);
	let moveOffsetMinutes = 0;
	let moveDurationMinutes = 0;

	let activePointerId = $state<number | null>(null);
	let validationMessage = $state('');

	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let pointerStartX = 0;
	let pointerStartY = 0;

	let existingSlots = $state<CalendarSlot[]>([
		makeTestSlot('slot-1', 0, 10 * 60, 11 * 60 + 30, 'Already open'),
		makeTestSlot('slot-2', 1, 14 * 60, 16 * 60, 'Booked'),
		makeTestSlot('slot-3', 2, 18 * 60 + 30, 20 * 60, 'Already open')
	]);

	const calendarHeight = $derived(24 * pixelsPerHour);

	const days = $derived(
		Array.from({ length: visibleDayCount }, (_, index) => {
			const date = addDays(startDate, index);

			return {
				date: toDateKey(date),
				label: date.toLocaleDateString(undefined, {
					weekday: 'short'
				}),
				displayDate: date.toLocaleDateString(undefined, {
					month: 'short',
					day: 'numeric'
				})
			};
		})
	);

	const hourLabels = Array.from({ length: 25 }, (_, hour) => hour);

	function previousDays() {
		startDate = addDays(startDate, -visibleDayCount);
		clearDraft();
	}

	function nextDays() {
		startDate = addDays(startDate, visibleDayCount);
		clearDraft();
	}

	function goToToday() {
		startDate = startOfDay(new Date());
		clearDraft();
	}

	function handlePointerDown(event: PointerEvent, date: string, element: HTMLElement) {
		if (event.pointerType === 'mouse' && event.button !== 0) return;

		pointerStartX = event.clientX;
		pointerStartY = event.clientY;
		validationMessage = '';

		if (event.pointerType === 'mouse') {
			beginDrag(event, date, element);
			return;
		}

		clearLongPress();

		longPressTimer = setTimeout(() => {
			beginDrag(event, date, element);
		}, 350);
	}

	function handlePointerMove(event: PointerEvent, date: string, element: HTMLElement) {
		if (!dragging && longPressTimer) {
			const distance = Math.hypot(event.clientX - pointerStartX, event.clientY - pointerStartY);

			if (distance > 10) {
				clearLongPress();
			}

			return;
		}

		if (!dragging || event.pointerId !== activePointerId || !draft) {
			return;
		}

		if (draft.date !== date) return;

		const pointerMinutes = minutesFromPointer(event, element);

		let startMinutes = draft.startMinutes;
		let endMinutes = pointerMinutes;

		if (pointerMinutes < draft.startMinutes) {
			startMinutes = pointerMinutes;
			endMinutes = draft.startMinutes + snapMinutes;
		} else {
			endMinutes = pointerMinutes + snapMinutes;
		}

		startMinutes = clamp(startMinutes, 0, MINUTES_PER_DAY - snapMinutes);
		endMinutes = clamp(
			Math.max(endMinutes, startMinutes + snapMinutes),
			snapMinutes,
			MINUTES_PER_DAY
		);

		const candidate = {
			date,
			startMinutes,
			endMinutes
		};

		const problem = validateDraft(candidate);

		if (problem) {
			validationMessage = problem;
			return;
		}

		validationMessage = '';
		draft = candidate;
	}

	function handlePointerUp(event: PointerEvent, element: HTMLElement) {
		if (!dragging || event.pointerId !== activePointerId) return;

		if (element.hasPointerCapture(event.pointerId)) {
			element.releasePointerCapture(event.pointerId);
		}

		clearDrag();
	}

	function handlePointerCancel() {
		clearDrag();
	}

	function clearDrag() {
		dragging = false;
		activePointerId = null;
		movingSlotId = null;
		moveMode = null;
		clearLongPress();
	}

	function beginSlotMove(
		event: PointerEvent,
		slot: CalendarSlot | DraftSlot,
		element: HTMLElement,
		id: string
	) {
		event.stopPropagation();
		if (event.pointerType === 'mouse' && event.button !== 0) return;

		const pointerMinutes = minutesFromPointer(event, element.parentElement as HTMLElement);
		moveOffsetMinutes = pointerMinutes - slot.startMinutes;
		moveDurationMinutes = slot.endMinutes - slot.startMinutes;
		movingSlotId = id;
		moveMode = 'move';
		dragging = true;
		activePointerId = event.pointerId;
		element.setPointerCapture(event.pointerId);
	}

	function moveSlot(event: PointerEvent, element: HTMLElement, slot: CalendarSlot | DraftSlot) {
		if (moveMode !== 'move' || movingSlotId === null || event.pointerId !== activePointerId) return;

		const day = dayAtPoint(event) ?? (element.parentElement as HTMLElement);
		const duration = moveDurationMinutes;
		const startMinutes = clamp(
			snap(minutesFromPointer(event, day) - moveOffsetMinutes, snapMinutes),
			0,
			MINUTES_PER_DAY - duration
		);
		const candidate = {
			date: day.dataset.date ?? slot.date,
			startMinutes,
			endMinutes: startMinutes + duration
		};
		const problem = validateDraft(candidate, movingSlotId === 'draft' ? undefined : movingSlotId);

		if (!problem) {
			validationMessage = '';
			if (movingSlotId === 'draft') {
				draft = candidate;
			} else {
				existingSlots = existingSlots.map((item) =>
					item.id === movingSlotId ? { ...item, ...candidate } : item
				);
			}
		}
	}

	function beginResize(
		event: PointerEvent,
		slot: CalendarSlot | DraftSlot,
		id: string,
		mode: 'resize-top' | 'resize-bottom'
	) {
		event.stopPropagation();
		if (event.pointerType === 'mouse' && event.button !== 0) return;

		movingSlotId = id;
		moveMode = mode;
		dragging = true;
		activePointerId = event.pointerId;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function resizeSlot(event: PointerEvent, element: HTMLElement, slot: CalendarSlot | DraftSlot) {
		if (
			!moveMode?.startsWith('resize') ||
			movingSlotId === null ||
			event.pointerId !== activePointerId
		)
			return;

		const day = element.parentElement as HTMLElement;
		const pointerMinutes = minutesFromPointer(event, day);
		const candidate = {
			date: slot.date,
			startMinutes:
				moveMode === 'resize-top'
					? Math.min(pointerMinutes, slot.endMinutes - snapMinutes)
					: slot.startMinutes,
			endMinutes:
				moveMode === 'resize-bottom'
					? Math.max(pointerMinutes, slot.startMinutes + snapMinutes)
					: slot.endMinutes
		};
		const problem = validateDraft(candidate, movingSlotId === 'draft' ? undefined : movingSlotId);

		if (problem) {
			validationMessage = problem;
			return;
		}

		validationMessage = '';
		if (movingSlotId === 'draft') {
			draft = candidate;
		} else {
			existingSlots = existingSlots.map((item) =>
				item.id === movingSlotId ? { ...item, ...candidate } : item
			);
		}
	}

	function dayAtPoint(event: PointerEvent): HTMLElement | null {
		return (
			document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('.day') ?? null
		);
	}

	function endSlotMove(event: PointerEvent, element: HTMLElement) {
		if (event.pointerId !== activePointerId) return;
		if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
		clearDrag();
	}

	function removeSlot(event: MouseEvent | PointerEvent, id: string) {
		event.stopPropagation();
		existingSlots = existingSlots.filter((slot) => slot.id !== id);
		if (movingSlotId === id) clearDrag();
	}

	function beginDrag(event: PointerEvent, date: string, element: HTMLElement) {
		const startMinutes = minutesFromPointer(event, element);

		const candidate: DraftSlot = {
			date,
			startMinutes,
			endMinutes: Math.min(startMinutes + 60, MINUTES_PER_DAY)
		};

		const problem = validateDraft(candidate);

		if (problem) {
			validationMessage = problem;
			return;
		}

		clearLongPress();

		dragging = true;
		activePointerId = event.pointerId;
		draft = candidate;

		element.setPointerCapture(event.pointerId);
	}

	function minutesFromPointer(event: PointerEvent, element: HTMLElement): number {
		const rect = element.getBoundingClientRect();
		const y = clamp(event.clientY - rect.top, 0, rect.height);

		const rawMinutes = (y / rect.height) * MINUTES_PER_DAY;

		return clamp(snap(rawMinutes, snapMinutes), 0, MINUTES_PER_DAY - snapMinutes);
	}

	function validateDraft(candidate: DraftSlot, ignoredSlotId?: string): string | null {
		if (candidate.endMinutes <= candidate.startMinutes) {
			return 'The slot must have a duration.';
		}

		if (isPast(candidate.date, candidate.startMinutes)) {
			return 'You cannot open a slot in the past.';
		}

		const overlaps = existingSlots.some((slot) => {
			if (slot.id === ignoredSlotId || slot.date !== candidate.date) return false;

			return candidate.startMinutes < slot.endMinutes && candidate.endMinutes > slot.startMinutes;
		});

		if (overlaps) {
			return 'That time overlaps an existing slot.';
		}

		return null;
	}

	function confirmDraft() {
		if (!draft) return;

		const problem = validateDraft(draft);

		if (problem) {
			validationMessage = problem;
			return;
		}

		existingSlots = [
			...existingSlots,
			{
				id: crypto.randomUUID(),
				date: draft.date,
				startMinutes: draft.startMinutes,
				endMinutes: draft.endMinutes,
				label: 'Test slot'
			}
		];

		draft = null;
		validationMessage = '';
	}

	function clearDraft() {
		draft = null;
		clearDrag();
		validationMessage = '';
	}

	function slotsForDay(date: string): CalendarSlot[] {
		return existingSlots
			.filter((slot) => slot.date === date)
			.sort((a, b) => a.startMinutes - b.startMinutes);
	}

	function slotTop(minutes: number): number {
		return (minutes / MINUTES_PER_DAY) * 100;
	}

	function slotHeight(startMinutes: number, endMinutes: number): number {
		return ((endMinutes - startMinutes) / MINUTES_PER_DAY) * 100;
	}

	function currentTimeTop(date: string): number | null {
		const now = new Date();

		if (date !== toDateKey(now)) return null;

		const minutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

		return slotTop(minutes);
	}

	function isPast(date: string, minutes: number): boolean {
		const value = dateAndMinutes(date, minutes);
		return value.getTime() < Date.now();
	}

	function isSlotPast(slot: CalendarSlot): boolean {
		return dateAndMinutes(slot.date, slot.endMinutes) < new Date();
	}

	onMount(() => {
		window.addEventListener('pointerup', clearDrag);

		return () => window.removeEventListener('pointerup', clearDrag);
	});

	function makeTestSlot(
		id: string,
		daysFromToday: number,
		startMinutes: number,
		endMinutes: number,
		label: string
	): CalendarSlot {
		return {
			id,
			date: toDateKey(addDays(startOfDay(new Date()), daysFromToday)),
			startMinutes,
			endMinutes,
			label
		};
	}

	function formatMinutes(minutes: number): string {
		if (minutes === MINUTES_PER_DAY) return '24:00';

		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;

		return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
	}

	function dateAndMinutes(date: string, minutes: number): Date {
		const value = new Date(`${date}T00:00:00`);
		value.setMinutes(minutes);
		return value;
	}

	function snap(value: number, interval: number): number {
		return Math.round(value / interval) * interval;
	}

	function clamp(value: number, min: number, max: number): number {
		return Math.min(Math.max(value, min), max);
	}

	function startOfDay(date: Date): Date {
		const copy = new Date(date);
		copy.setHours(0, 0, 0, 0);
		return copy;
	}

	function addDays(date: Date, amount: number): Date {
		const copy = new Date(date);
		copy.setDate(copy.getDate() + amount);
		return copy;
	}

	function toDateKey(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');

		return `${year}-${month}-${day}`;
	}

	function clearLongPress() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}
</script>

<h1>Open slots</h1>

<nav>
	<button onclick={previousDays}>Previous</button>
	<button onclick={goToToday}>Today</button>
	<button onclick={nextDays}>Next</button>
</nav>

<div class="settings">
	<label>
		Days
		<select bind:value={visibleDayCount}>
			<option value={1}>1 day</option>
			<option value={3}>3 days</option>
			<option value={5}>5 days</option>
		</select>
	</label>

	<label>
		Snap
		<select bind:value={snapMinutes}>
			<option value={5}>5 minutes</option>
			<option value={10}>10 minutes</option>
			<option value={15}>15 minutes</option>
			<option value={30}>30 minutes</option>
		</select>
	</label>

	<label>
		Zoom
		<input type="range" min="35" max="140" step="5" bind:value={pixelsPerHour} />
		{pixelsPerHour}px/hour
	</label>
</div>

<p>Desktop: click and drag. Touch: long-press, then drag.</p>

<div
	class="calendar"
	style={`
		--day-count: ${visibleDayCount};
		--calendar-height: ${calendarHeight}px;
	`}
>
	<div class="corner"></div>

	{#each days as day}
		<header>
			<strong>{day.label}</strong>
			<span>{day.displayDate}</span>
		</header>
	{/each}

	<div class="times" style={`height: ${calendarHeight}px`}>
		{#each hourLabels as hour}
			<span style={`top: ${(hour / 24) * 100}%`}>
				{String(hour).padStart(2, '0')}:00
			</span>
		{/each}
	</div>

	{#each days as day}
		<div
			class:dragging
			class="day"
			data-date={day.date}
			style={`height: ${calendarHeight}px`}
			role="application"
			aria-label={`Availability for ${day.date}`}
			onpointerdown={(event) => handlePointerDown(event, day.date, event.currentTarget)}
			onpointermove={(event) => handlePointerMove(event, day.date, event.currentTarget)}
			onpointerup={(event) => handlePointerUp(event, event.currentTarget)}
			onpointercancel={handlePointerCancel}
			onlostpointercapture={handlePointerCancel}
			onpointerleave={handlePointerCancel}
		>
			{#each hourLabels as hour}
				<div class="hour-line" style={`top: ${(hour / 24) * 100}%`}></div>
			{/each}

			{#if day.date === toDateKey(new Date())}
				<div
					class="past-overlay"
					style={`height: ${slotTop(new Date().getHours() * 60 + new Date().getMinutes())}%`}
				></div>
			{/if}

			{#each slotsForDay(day.date) as slot}
				<div
					class="existing-slot"
					class:past={isSlotPast(slot)}
					role="group"
					aria-label={`${slot.label}, draggable slot`}
					style={`
						top: ${slotTop(slot.startMinutes)}%;
						height: ${slotHeight(slot.startMinutes, slot.endMinutes)}%;
					`}
					onpointerdown={(event) => beginSlotMove(event, slot, event.currentTarget, slot.id)}
					onpointermove={(event) => moveSlot(event, event.currentTarget, slot)}
					onpointerup={(event) => endSlotMove(event, event.currentTarget)}
					onpointercancel={handlePointerCancel}
					onlostpointercapture={handlePointerCancel}
				>
					<button
						class="resize-handle resize-top"
						type="button"
						aria-label={`Resize top of ${slot.label}`}
						onpointerdown={(event) => beginResize(event, slot, slot.id, 'resize-top')}
						onpointermove={(event) => resizeSlot(event, event.currentTarget, slot)}
					>
						<span></span>
					</button>
					<button
						class="remove-slot"
						type="button"
						aria-label={`Remove ${slot.label}`}
						onpointerdown={(event) => event.stopPropagation()}
						onclick={(event) => removeSlot(event, slot.id)}
					>
						×
					</button>
					<strong>{slot.label}</strong>
					<span>
						{formatMinutes(slot.startMinutes)}
						–
						{formatMinutes(slot.endMinutes)}
					</span>
					<button
						class="resize-handle resize-bottom"
						type="button"
						aria-label={`Resize bottom of ${slot.label}`}
						onpointerdown={(event) => beginResize(event, slot, slot.id, 'resize-bottom')}
						onpointermove={(event) => resizeSlot(event, event.currentTarget, slot)}
					>
						<span></span>
					</button>
				</div>
			{/each}

			{#if currentTimeTop(day.date) !== null}
				<div class="current-time" style={`top: ${currentTimeTop(day.date)}%`}></div>
			{/if}

			{#if draft?.date === day.date}
				<div
					class="draft-slot"
					role="group"
					aria-label="Draft draggable slot"
					style={`
						top: ${slotTop(draft!.startMinutes)}%;
						height: ${slotHeight(draft!.startMinutes, draft!.endMinutes)}%;
					`}
					onpointerdown={(event) => beginSlotMove(event, draft!, event.currentTarget, 'draft')}
					onpointermove={(event) => moveSlot(event, event.currentTarget, draft!)}
					onpointerup={(event) => endSlotMove(event, event.currentTarget)}
					onpointercancel={handlePointerCancel}
					onlostpointercapture={handlePointerCancel}
				>
					<button
						class="resize-handle resize-top"
						type="button"
						aria-label="Resize top of draft"
						onpointerdown={(event) => beginResize(event, draft!, 'draft', 'resize-top')}
						onpointermove={(event) => resizeSlot(event, event.currentTarget, draft!)}
					>
						<span></span>
					</button>
					<button
						class="remove-slot"
						type="button"
						aria-label="Remove draft"
						onpointerdown={(event) => event.stopPropagation()}
						onclick={clearDraft}>×</button
					>
					<strong>Draft</strong>
					<span>
						{formatMinutes(draft!.startMinutes)}
						–
						{formatMinutes(draft!.endMinutes)}
					</span>
					<button
						class="resize-handle resize-bottom"
						type="button"
						aria-label="Resize bottom of draft"
						onpointerdown={(event) => beginResize(event, draft!, 'draft', 'resize-bottom')}
						onpointermove={(event) => resizeSlot(event, event.currentTarget, draft!)}
					>
						<span></span>
					</button>
				</div>
			{/if}
		</div>
	{/each}
</div>

{#if draft}
	<section class="draft-actions">
		<p>
			<strong>{draft.date}</strong>:
			{formatMinutes(draft.startMinutes)}
			–
			{formatMinutes(draft.endMinutes)}
		</p>

		<button onclick={confirmDraft}>Add test slot</button>
		<button onclick={clearDraft}>Cancel</button>
	</section>
{/if}

{#if validationMessage}
	<p role="alert">{validationMessage}</p>
{/if}

<style>
	nav,
	.settings,
	.draft-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.settings label {
		display: grid;
		gap: 0.25rem;
	}

	.calendar {
		display: grid;
		grid-template-columns:
			4rem
			repeat(var(--day-count), minmax(8rem, 1fr));
		grid-template-rows: auto var(--calendar-height);
		max-height: 80vh;
		overflow: auto;
		border: 1px solid #aaa;
	}

	.corner,
	header {
		position: sticky;
		top: 0;
		z-index: 5;
		background: white;
		border-bottom: 1px solid #aaa;
	}

	header {
		display: grid;
		padding: 0.35rem;
		text-align: center;
	}

	.times {
		position: sticky;
		left: 0;
		z-index: 3;
		background: white;
		border-right: 1px solid #aaa;
	}

	.times span {
		position: absolute;
		right: 0.25rem;
		transform: translateY(-50%);
		font-size: 0.7rem;
	}

	.day {
		position: relative;
		border-right: 1px solid #aaa;
		touch-action: pan-y;
		user-select: none;
	}

	.day.dragging {
		cursor: ns-resize;
	}

	.hour-line {
		position: absolute;
		left: 0;
		right: 0;
		border-top: 1px solid #ddd;
		pointer-events: none;
	}

	.existing-slot,
	.draft-slot {
		position: absolute;
		left: 0.2rem;
		right: 0.2rem;
		display: grid;
		align-content: start;
		padding: 0.25rem;
		overflow: hidden;
		border: 1px solid #555;
		background: #ddd;
		pointer-events: auto;
		cursor: grab;
		touch-action: none;
	}

	.existing-slot:active,
	.draft-slot:active {
		cursor: grabbing;
	}

	.resize-handle {
		position: absolute;
		left: 0;
		right: 0;
		z-index: 2;
		height: 1rem;
		padding: 0;
		border: 0;
		background: transparent;
		cursor: ns-resize;
		touch-action: none;
	}

	.resize-handle span {
		display: block;
		width: 2.5rem;
		height: 0.2rem;
		margin: auto;
		border-radius: 1rem;
		background: currentColor;
		opacity: 0.45;
	}

	.resize-top {
		top: 0;
	}

	.resize-bottom {
		bottom: 0;
	}

	.remove-slot {
		position: absolute;
		top: 0.15rem;
		right: 0.15rem;
		z-index: 1;
		width: 1.25rem;
		height: 1.25rem;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.12);
		color: inherit;
		font-size: 1rem;
		line-height: 1;
		cursor: pointer;
	}

	.remove-slot:hover {
		background: rgba(0, 0, 0, 0.25);
	}

	.existing-slot.past {
		opacity: 0.45;
		background: #ccc;
		border-color: #aaa;
	}

	.past-overlay {
		position: absolute;
		inset: 0 0 auto;
		z-index: 1;
		background: rgba(0, 0, 0, 0.05);
		pointer-events: none;
	}

	.draft-slot {
		border-style: dashed;
		background: #eee;
	}

	.existing-slot span,
	.draft-slot span {
		font-size: 0.75rem;
	}

	.current-time {
		position: absolute;
		left: 0;
		right: 0;
		z-index: 2;
		border-top: 2px solid red;
		pointer-events: none;
	}
</style>
