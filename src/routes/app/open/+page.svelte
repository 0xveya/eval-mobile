<script lang="ts">
	import { onMount } from 'svelte';
	import { getOpenSlots } from '$lib/remote/slots.remote';
	import CalendarGrid from '$lib/components/calendar/CalendarGrid.svelte';
	import CalendarToolbar from '$lib/components/calendar/CalendarToolbar.svelte';
	import { addDays, startOfDay, toDateKey } from '$lib/components/calendar/calendar-math';
	import type { CalendarSlot, DayLayout, DraftSlot } from '$lib/components/calendar/calendar-types';

	let dayLayout = $state<DayLayout>('auto');
	// Mobile-first fallback avoids rendering three columns before matchMedia runs.
	let narrowScreen = $state(true);
	let snapMinutes = $state(15);
	let pixelsPerHour = $state(70);
	let startDate = $state(startOfDay(new Date()));
	let draft = $state<DraftSlot | null>(null);
	let validationMessage = $state('');
	let remoteSlotCount = $state(0);
	let existingSlots = $state<CalendarSlot[]>([
		makeTestSlot('slot-1', 0, 10 * 60, 11 * 60 + 30, 'Already open'),
		{ ...makeTestSlot('slot-2', 1, 14 * 60, 16 * 60, 'Booked'), status: 'booked' },
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

	function fromRemoteSlot(slot: Awaited<ReturnType<typeof getOpenSlots>>[number]): CalendarSlot {
		const start = new Date(slot.begin_at);
		const end = new Date(slot.end_at);
		const booked = slot.scale_team !== null;
		return {
			id: `remote-${slot.id}`,
			date: toDateKey(start),
			endDate: toDateKey(end),
			startMinutes: start.getHours() * 60 + start.getMinutes(),
			endMinutes: end.getHours() * 60 + end.getMinutes(),
			label: booked ? 'Booked' : 'Open',
			status: booked ? 'booked' : 'open',
			remote: true
		};
	}

	onMount(() => {
		const query = window.matchMedia('(max-width: 520px)');
		const update = () => {
			narrowScreen = query.matches;
		};
		update();
		query.addEventListener('change', update);
		void getOpenSlots()
			.then((remoteSlots) => {
				const fetched = remoteSlots.map(fromRemoteSlot);
				remoteSlotCount = fetched.length;
				existingSlots = [...existingSlots.filter((slot) => !slot.remote), ...fetched];
			})
			.catch(() => {
				validationMessage = 'Could not load your slots.';
			});
		return () => query.removeEventListener('change', update);
	});
</script>

<svelte:head><title>Open slots</title></svelte:head>

<main>
	<CalendarToolbar
		bind:dayLayout
		bind:snapMinutes
		bind:pixelsPerHour
		onprevious={() => changeRange(-visibleDayCount)}
		ontoday={goToToday}
		onnext={() => changeRange(visibleDayCount)}
		{draft}
		onconfirm={confirmDraft}
		oncancel={clearDraft}
	/>
	<CalendarGrid
		{days}
		bind:slots={existingSlots}
		bind:draft
		snapInterval={snapMinutes}
		{calendarHeight}
		onvalidation={(message) => (validationMessage = message)}
		onedgenavigate={(direction) => (startDate = addDays(startDate, direction))}
	/>
	{#if remoteSlotCount > 0}<p class="loaded">{remoteSlotCount} fetched slots loaded</p>{/if}
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
	.loaded {
		margin: 0.5rem 0 0;
		color: #666;
		font-size: 0.75rem;
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
			padding: 0.5rem 0 7rem;
		}
	}
</style>
