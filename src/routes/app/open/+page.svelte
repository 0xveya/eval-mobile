<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import {
		createOpenSlot,
		deleteOpenSlots,
		getOpenSlots,
		getOpenSlotsFresh,
		getSlotSettings,
		updateOpenSlot
	} from '$lib/remote/slots.remote';
	import CalendarGrid from '$lib/components/calendar/CalendarGrid.svelte';
	import CalendarToolbar from '$lib/components/calendar/CalendarToolbar.svelte';
	import CalendarHelp from '$lib/components/calendar/CalendarHelp.svelte';
	import {
		addDays,
		dateAndMinutes,
		startOfDay,
		toDateKey
	} from '$lib/components/calendar/calendar-math';
	import type { CalendarSlot, DayLayout, DraftSlot } from '$lib/components/calendar/calendar-types';

	let { data } = $props();
	let dayLayout = $state<DayLayout>('auto');
	// Mobile-first fallback avoids rendering three columns before matchMedia runs.
	let narrowScreen = $state(true);
	const snapMinutes = 15;
	let minimumDuration = $state(30);
	let pixelsPerHour = $state(55);
	let startDate = $state(startOfDay(new Date()));
	let draft = $state<DraftSlot | null>(null);
	let editingSlot = $state<CalendarSlot | null>(null);
	let validationMessage = $state('');
	let showHelp = $state(false);
	let mobileHelp = $state(true);
	let mockStorageReady = $state(false);
	const useMockData = env.PUBLIC_USE_MOCK_DATA === 'true';
	const mockSlotsKey = $derived(`eval-mobile-mock-slots:${data.user.id}`);
	let existingSlots = $state<CalendarSlot[]>(
		useMockData
			? [
					makeTestSlot('slot-1', 0, 10 * 60, 11 * 60 + 30, 'Open'),
					{ ...makeTestSlot('slot-2', 1, 14 * 60, 16 * 60, 'Booked'), status: 'booked' },
					makeTestSlot('slot-3', 2, 18 * 60 + 30, 20 * 60, 'Open')
				]
			: []
	);

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
		editingSlot = null;
		validationMessage = '';
	}
	function startEditingSlot(slot: CalendarSlot) {
		if (slot.status === 'booked') return;
		editingSlot = {
			id: slot.id,
			date: slot.date,
			endDate: slot.endDate,
			startMinutes: slot.startMinutes,
			endMinutes: slot.endMinutes,
			label: slot.label,
			status: slot.status,
			remote: slot.remote,
			remoteIds: slot.remoteIds ? [...slot.remoteIds] : undefined,
			scaleTeamId: slot.scaleTeamId
		};
		draft = {
			date: slot.date,
			endDate: slot.endDate,
			startMinutes: slot.startMinutes,
			endMinutes: slot.endMinutes,
			status: slot.status,
			remote: slot.remote,
			remoteIds: slot.remoteIds
		};
		validationMessage = '';
	}
	async function confirmDraft() {
		if (!draft) return;
		const start = dateAndMinutes(draft.date, draft.startMinutes);
		const end = dateAndMinutes(draft.endDate ?? draft.date, draft.endMinutes);
		if ((end.getTime() - start.getTime()) / 60_000 < minimumDuration) {
			validationMessage = `Your campus requires slots of at least ${minimumDuration} minutes.`;
			return;
		}
		if (editingSlot) {
			const before = editingSlot;
			const after: CalendarSlot = { ...before, ...draft };
			existingSlots = existingSlots.map((slot) => (slot.id === before.id ? after : slot));
			clearDraft();
			if (!useMockData) await updateExistingSlot(before, after);
			return;
		}
		if (useMockData) {
			existingSlots = [...existingSlots, { id: crypto.randomUUID(), ...draft, label: 'Open slot' }];
			clearDraft();
			return;
		}
		try {
			const slots = await createOpenSlot({
				beginAt: start.toISOString(),
				endAt: end.toISOString()
			});
			existingSlots = fromRemoteSlots(slots);
			clearDraft();
		} catch (error) {
			validationMessage = apiErrorMessage('open that slot', error);
		}
	}

	async function removeExistingSlot(slot: CalendarSlot): Promise<boolean> {
		if (useMockData) return true;
		const remoteIds = slot.remoteIds ?? [Number(slot.id.replace(/^remote-/, ''))];
		if (remoteIds.length === 0 || remoteIds.some((id) => !Number.isInteger(id))) return false;
		// Closing a grouped range can require several 42 requests. Remove it from
		// the calendar immediately, then reconcile with the server response.
		existingSlots = existingSlots.filter((item) => item.id !== slot.id);
		try {
			const { slots, failedIds } = await deleteOpenSlots({ ids: remoteIds });
			existingSlots = fromRemoteSlots(slots);
			if (failedIds.length > 0) {
				validationMessage = 'Some parts of that slot could not be closed. Please try again.';
			}
			return false;
		} catch (error) {
			try {
				existingSlots = fromRemoteSlots(await getOpenSlotsFresh());
			} catch {
				// Keep the optimistic state; the next fresh page load reconciles it.
			}
			validationMessage = apiErrorMessage('close that slot', error);
			return false;
		}
	}

	async function updateExistingSlot(before: CalendarSlot, after: CalendarSlot): Promise<void> {
		if (useMockData || !before.remote) return;
		const remoteIds = before.remoteIds ?? [Number(before.id.replace(/^remote-/, ''))];
		if (remoteIds.length === 0 || remoteIds.some((id) => !Number.isInteger(id))) return;
		try {
			const response = await updateOpenSlot({
				ids: remoteIds,
				beginAt: dateAndMinutes(after.date, after.startMinutes).toISOString(),
				endAt: dateAndMinutes(after.endDate ?? after.date, after.endMinutes).toISOString()
			});
			existingSlots = fromRemoteSlots(response.slots);
			if (response.updateError || response.failedIds.length > 0) {
				const details = [
					response.updateError,
					response.failedIds.length > 0
						? `${response.failedIds.length} old slot part${response.failedIds.length === 1 ? '' : 's'} could not be removed.`
						: null
				].filter(Boolean);
				validationMessage = `Could not fully update that slot. ${details.join(' ')}`;
			}
		} catch (error) {
			validationMessage = apiErrorMessage('update that slot', error);
			try {
				existingSlots = fromRemoteSlots(await getOpenSlotsFresh());
			} catch {
				// The next fresh page load reconciles the calendar.
			}
		}
	}

	function apiErrorMessage(action: string, cause: unknown): string {
		const detail =
			cause instanceof Error
				? cause.message
				: typeof cause === 'object' && cause !== null && 'message' in cause
					? String(cause.message)
					: '';
		return detail && !/^\[object Object\]$/.test(detail)
			? `Could not ${action}. ${detail}`
			: `Could not ${action}. Please try again; if it keeps failing, check your 42 session and slot rules.`;
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

	type RemoteSlot = Awaited<ReturnType<typeof getOpenSlots>>[number];

	function fromRemoteSlots(slots: RemoteSlot[]): CalendarSlot[] {
		const groups: CalendarSlot[] = [];
		for (const slot of slots.toSorted((a, b) => Date.parse(a.begin_at) - Date.parse(b.begin_at))) {
			const mapped = fromRemoteSlot(slot);
			const previous = groups.at(-1);
			if (
				previous &&
				previous.status === mapped.status &&
				(mapped.status === 'open' ||
					mapped.scaleTeamId === undefined ||
					previous.scaleTeamId === mapped.scaleTeamId) &&
				dateAndMinutes(previous.endDate ?? previous.date, previous.endMinutes).getTime() ===
					Date.parse(slot.begin_at)
			) {
				previous.endDate = mapped.endDate;
				previous.endMinutes = mapped.endMinutes;
				previous.remoteIds = [...(previous.remoteIds ?? []), slot.id];
				continue;
			}
			groups.push(mapped);
		}
		return groups;
	}

	function fromRemoteSlot(slot: RemoteSlot): CalendarSlot {
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
			remote: true,
			remoteIds: [slot.id],
			scaleTeamId:
				typeof slot.scale_team === 'object' &&
				slot.scale_team !== null &&
				'id' in slot.scale_team &&
				typeof slot.scale_team.id === 'number'
					? slot.scale_team.id
					: undefined
		};
	}

	onMount(() => {
		const query = window.matchMedia('(max-width: 520px)');
		const update = () => {
			narrowScreen = query.matches;
		};
		update();
		mobileHelp = window.matchMedia('(pointer: coarse), (max-width: 520px)').matches;
		try {
			showHelp = localStorage.getItem(`eval-mobile-slot-guide:${data.user.id}`) !== 'seen';
		} catch {
			showHelp = true;
		}
		query.addEventListener('change', update);
		if (useMockData) {
			try {
				const stored = localStorage.getItem(mockSlotsKey);
				if (stored) {
					const parsed = JSON.parse(stored) as unknown;
					if (isCalendarSlotArray(parsed)) existingSlots = parsed;
				}
			} catch {
				// Keep the built-in fixtures when stored mock data is unavailable or invalid.
			}
			mockStorageReady = true;
		} else {
			void getOpenSlotsFresh()
				.then((remoteSlots) => {
					const fetched = fromRemoteSlots(remoteSlots);
					existingSlots = fetched;
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
		}
		return () => query.removeEventListener('change', update);
	});

	$effect(() => {
		if (!useMockData || !mockStorageReady) return;
		try {
			localStorage.setItem(mockSlotsKey, JSON.stringify(existingSlots));
		} catch {
			// Mock interactions still work for this page when storage is unavailable.
		}
	});

	function isCalendarSlotArray(value: unknown): value is CalendarSlot[] {
		return (
			Array.isArray(value) &&
			value.every(
				(slot) =>
					typeof slot === 'object' &&
					slot !== null &&
					'id' in slot &&
					typeof slot.id === 'string' &&
					'date' in slot &&
					typeof slot.date === 'string' &&
					'startMinutes' in slot &&
					typeof slot.startMinutes === 'number' &&
					'endMinutes' in slot &&
					typeof slot.endMinutes === 'number'
			)
		);
	}

	function dismissHelp() {
		showHelp = false;
		try {
			localStorage.setItem(`eval-mobile-slot-guide:${data.user.id}`, 'seen');
		} catch {
			// Dismiss for this page even when storage is unavailable.
		}
	}
</script>

<svelte:head><title>Open slots</title></svelte:head>

<main class:has-draft={draft !== null}>
	<CalendarToolbar
		bind:dayLayout
		bind:pixelsPerHour
		{minimumDuration}
		editing={editingSlot !== null}
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
		editingSlotId={editingSlot?.id ?? null}
		snapInterval={snapMinutes}
		{minimumDuration}
		{calendarHeight}
		onvalidation={(message) => (validationMessage = message)}
		onedgenavigate={(direction) => (startDate = addDays(startDate, direction))}
		onzoom={(direction) =>
			(pixelsPerHour = Math.min(140, Math.max(35, pixelsPerHour + direction * 10)))}
		onremoveslot={removeExistingSlot}
		onupdateslot={updateExistingSlot}
		onstartedit={startEditingSlot}
	/>
	{#if validationMessage}<p class="alert" role="alert">{validationMessage}</p>{/if}
</main>

{#if showHelp}<CalendarHelp mobile={mobileHelp} ondismiss={dismissHelp} />{/if}

<style>
	main {
		width: min(76rem, calc(100% - 2rem));
		margin: 0 auto;
		padding: 1rem 0 4.25rem;
	}
	main.has-draft {
		padding-bottom: 7rem;
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
