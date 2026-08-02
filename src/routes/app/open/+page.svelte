<script lang="ts">
	import { onMount } from 'svelte';
	import CalendarGrid from '$lib/components/calendar/CalendarGrid.svelte';
	import CalendarToolbar from '$lib/components/calendar/CalendarToolbar.svelte';
	import {
		addDays,
		formatMinutes,
		startOfDay,
		toDateKey
	} from '$lib/components/calendar/calendar-math';
	import type { CalendarSlot, DayLayout, DraftSlot } from '$lib/components/calendar/calendar-types';

	let dayLayout = $state<DayLayout>('auto');
	let narrowScreen = $state(false);
	let snapMinutes = $state(15);
	let pixelsPerHour = $state(70);
	let startDate = $state(startOfDay(new Date()));
	let draft = $state<DraftSlot | null>(null);
	let validationMessage = $state('');
	let existingSlots = $state<CalendarSlot[]>([
		makeTestSlot('slot-1', 0, 10 * 60, 11 * 60 + 30, 'Already open'),
		makeTestSlot('slot-2', 1, 14 * 60, 16 * 60, 'Booked'),
		makeTestSlot('slot-3', 2, 18 * 60 + 30, 20 * 60, 'Already open')
	]);

	const visibleDayCount = $derived(dayLayout === 'auto' ? (narrowScreen ? 1 : 3) : dayLayout);
	const calendarHeight = $derived(24 * pixelsPerHour);
	const days = $derived(
		Array.from({ length: visibleDayCount }, (_, index) => {
			const date = addDays(startDate, index);
			return {
				date: toDateKey(date),
				label: date.toLocaleDateString(undefined, { weekday: 'short' }),
				displayDate: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
			};
		})
	);

	function changeRange(amount: number) {
		startDate = addDays(startDate, amount);
		clearDraft();
	}
	function goToToday() {
		startDate = startOfDay(new Date());
		clearDraft();
	}
	function clearDraft() {
		draft = null;
		validationMessage = '';
	}
	function confirmDraft() {
		if (!draft) return;
		existingSlots = [...existingSlots, { id: crypto.randomUUID(), ...draft, label: 'Open slot' }];
		clearDraft();
	}
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

	onMount(() => {
		const query = window.matchMedia('(max-width: 520px)');
		const update = () => {
			narrowScreen = query.matches;
		};
		update();
		query.addEventListener('change', update);
		return () => query.removeEventListener('change', update);
	});
</script>

<svelte:head><title>Open slots</title></svelte:head>

<main>
	<header class="page-heading">
		<div>
			<span class="eyebrow">Availability</span>
			<h1>Open slots</h1>
		</div>
		<p>Drag across the calendar to create a window. On touch, press and hold first.</p>
	</header>
	<CalendarToolbar
		bind:dayLayout
		bind:snapMinutes
		bind:pixelsPerHour
		onprevious={() => changeRange(-visibleDayCount)}
		ontoday={goToToday}
		onnext={() => changeRange(visibleDayCount)}
	/>
	<CalendarGrid
		{days}
		bind:slots={existingSlots}
		bind:draft
		snapInterval={snapMinutes}
		{calendarHeight}
		onvalidation={(message) => (validationMessage = message)}
	/>

	{#if draft}
		<section class="draft-actions">
			<div>
				<span>New opening</span><strong
					>{draft.date} · {formatMinutes(draft.startMinutes)}–{formatMinutes(
						draft.endMinutes
					)}</strong
				>
			</div>
			<div>
				<button class="secondary" type="button" onclick={clearDraft}>Cancel</button><button
					type="button"
					onclick={confirmDraft}>Add slot</button
				>
			</div>
		</section>
	{/if}
	{#if validationMessage}<p class="alert" role="alert">{validationMessage}</p>{/if}
</main>

<style>
	:global(body) {
		margin: 0;
		background: #fff;
		color: #222;
		font-family: sans-serif;
	}
	main {
		width: min(76rem, calc(100% - 2rem));
		margin: 0 auto;
		padding: 1rem 0 3rem;
	}
	.page-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 2rem;
		margin-bottom: 0.75rem;
	}
	h1 {
		margin: 0;
		font-size: 1.5rem;
	}
	.eyebrow {
		color: #26736b;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.15em;
		text-transform: uppercase;
	}
	.page-heading p {
		max-width: 26rem;
		margin: 0;
		color: #6d685f;
		font-size: 0.9rem;
	}
	.draft-actions {
		position: sticky;
		bottom: 1rem;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		width: min(38rem, calc(100% - 2rem));
		margin: 1rem auto 0;
		padding: 0.8rem 1rem;
		border: 1px solid #aaa;
		border-radius: 0.25rem;
		background: #fff;
	}
	.draft-actions div {
		display: grid;
		gap: 0.15rem;
	}
	.draft-actions div:last-child {
		display: flex;
	}
	.draft-actions span {
		color: #777269;
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	.draft-actions strong {
		font-size: 0.85rem;
	}
	button {
		min-height: 2.4rem;
		padding: 0 1rem;
		border: 1px solid #222;
		border-radius: 0.25rem;
		background: #222;
		color: #fff;
		font-weight: 750;
		cursor: pointer;
	}
	button.secondary {
		background: #fff;
		color: #25231f;
	}
	.alert {
		margin: 0.75rem 0 0;
		color: #a23418;
		font-weight: 700;
		text-align: center;
	}
	@media (max-width: 620px) {
		main {
			width: min(100% - 1rem, 76rem);
			padding-top: 0.5rem;
		}
		.page-heading {
			gap: 0.5rem;
			margin-bottom: 0.5rem;
		}
		.page-heading p {
			display: none;
		}
		.eyebrow {
			display: none;
		}
		h1 {
			font-size: 1.25rem;
		}
		.draft-actions {
			width: auto;
		}
	}
</style>
