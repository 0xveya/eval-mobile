<script lang="ts">
	import { onMount } from 'svelte';
	import { getOpenSlots, getSlotSettings } from '$lib/remote/slots.remote';
	import CalendarGrid from '$lib/components/calendar/CalendarGrid.svelte';
	import CalendarToolbar from '$lib/components/calendar/CalendarToolbar.svelte';
	import {
		addDays,
		dateAndMinutes,
		startOfDay,
		toDateKey
	} from '$lib/components/calendar/calendar-math';
	import type { CalendarSlot, DayLayout, DraftSlot } from '$lib/components/calendar/calendar-types';

	let dayLayout = $state<DayLayout>('auto');
	// Mobile-first fallback avoids rendering three columns before matchMedia runs.
	let narrowScreen = $state(true);
	const snapMinutes = 15;
	let minimumDuration = $state(30);
	let pixelsPerHour = $state(55);
	let startDate = $state(startOfDay(new Date()));
	let draft = $state<DraftSlot | null>(null);
	let validationMessage = $state('');
	let remoteSlotCount = $state(0);
	let existingSlots = $state<CalendarSlot[]>([
		makeTestSlot('slot-1', 0, 10 * 60, 11 * 60 + 30, 'Open'),
		{ ...makeTestSlot('slot-2', 1, 14 * 60, 16 * 60, 'Booked'), status: 'booked' },
		makeTestSlot('slot-3', 2, 18 * 60 + 30, 20 * 60, 'Open')
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
		const start = dateAndMinutes(draft.date, draft.startMinutes);
		const end = dateAndMinutes(draft.endDate ?? draft.date, draft.endMinutes);
		if ((end.getTime() - start.getTime()) / 60_000 < minimumDuration) {
			validationMessage = `Your campus requires slots of at least ${minimumDuration} minutes.`;
			return;
		}
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
		void getSlotSettings()
			.then((settings) => {
				minimumDuration = settings.minimumDurationMinutes;
			})
			.catch(() => {
				// Keep the API's documented 30-minute default.
			});
		return () => query.removeEventListener('change', update);
	});
</script>

<svelte:head><title>Open slots</title></svelte:head>

<main class:has-draft={draft !== null}>
	<CalendarToolbar
		bind:dayLayout
		bind:pixelsPerHour
		{minimumDuration}
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
		{minimumDuration}
		{calendarHeight}
		onvalidation={(message) => (validationMessage = message)}
		onedgenavigate={(direction) => (startDate = addDays(startDate, direction))}
		onzoom={(direction) =>
			(pixelsPerHour = Math.min(140, Math.max(35, pixelsPerHour + direction * 10)))}
	/>
	{#if remoteSlotCount > 0}<p class="loaded">{remoteSlotCount} fetched slots loaded</p>{/if}
	{#if validationMessage}<p class="alert" role="alert">{validationMessage}</p>{/if}
</main>

<style>
	main {
		width: min(76rem, calc(100% - 2rem));
		margin: 0 auto;
		padding: 1rem 0 4.25rem;
	}
	main.has-draft {
		padding-bottom: 7rem;
	}
	.loaded {
		margin: 0.5rem 0 0;
		color: #666;
		font-size: 0.75rem;
	}
	.alert {
		position: fixed;
		top: max(0.6rem, env(safe-area-inset-top));
		left: 50%;
		z-index: 110;
		width: min(28rem, calc(100% - 1rem));
		margin: 0;
		padding: 0.65rem 0.8rem;
		transform: translateX(-50%);
		border: 1px solid var(--love);
		border-radius: 0.5rem;
		background: var(--surface);
		color: var(--love);
		font-weight: 700;
		text-align: center;
		pointer-events: none;
	}
	@media (max-width: 620px) {
		main {
			width: min(100% - 1rem, 76rem);
			padding: 0.25rem 0 3.75rem;
		}
		main.has-draft {
			padding-bottom: 7rem;
		}
	}
</style>
