<script lang="ts">
	import { formatMinutes, slotHeight, slotTop } from './calendar-math';
	import type { CalendarSlot, DraftSlot } from './calendar-types';

	let {
		slot,
		id,
		draft = false,
		past = false,
		locked = false,
		boundaryGap = false,
		showStartHandle = true,
		showEndHandle = true,
		onmove,
		onresize,
		onremove
	}: {
		slot: CalendarSlot | DraftSlot;
		id: string;
		draft?: boolean;
		past?: boolean;
		locked?: boolean;
		boundaryGap?: boolean;
		showStartHandle?: boolean;
		showEndHandle?: boolean;
		onmove: (event: PointerEvent, element: HTMLElement) => void;
		onresize: (event: PointerEvent, edge: 'start' | 'end', element: HTMLElement) => void;
		onremove: (event: MouseEvent) => void;
	} = $props();

	const label = $derived(draft ? 'Draft' : (slot as CalendarSlot).label);
	const compact = $derived(slot.endMinutes - slot.startMinutes <= 45);

	function handleMoveDown(event: PointerEvent, element: HTMLElement) {
		if (locked) {
			event.stopPropagation();
			return;
		}
		onmove(event, element);
	}
</script>

<div
	class="slot"
	class:draft
	class:past
	class:locked
	class:compact
	data-slot-id={id}
	role="group"
	aria-label={`${label}, draggable slot`}
	style={`top:calc(${slotTop(slot.startMinutes)}% + ${boundaryGap ? 4 : 0}px);height:calc(${slotHeight(slot.startMinutes, slot.endMinutes)}% - ${boundaryGap ? 4 : 0}px)`}
	onpointerdown={(event) => handleMoveDown(event, event.currentTarget)}
>
	{#if !locked && showStartHandle}<button
			class="resize top"
			type="button"
			aria-label={`Resize start of ${label}`}
			onpointerdown={(event) => onresize(event, 'start', event.currentTarget)}><span></span></button
		>{/if}
	<button
		class="remove"
		type="button"
		aria-label={locked ? `Cancel ${label}` : `Remove ${label}`}
		onpointerdown={(event) => event.stopPropagation()}
		onclick={onremove}>×</button
	>
	<div class="slot-label">
		<strong>{label}</strong>
		<span>{formatMinutes(slot.startMinutes)}–{formatMinutes(slot.endMinutes)}</span>
	</div>
	{#if !locked && showEndHandle}<button
			class="resize bottom"
			type="button"
			aria-label={`Resize end of ${label}`}
			onpointerdown={(event) => onresize(event, 'end', event.currentTarget)}><span></span></button
		>{/if}
</div>

<style>
	.slot {
		position: absolute;
		left: 0.3rem;
		right: 0.3rem;
		z-index: 3;
		display: grid;
		align-content: start;
		min-height: 0;
		padding: 0.3rem 0.5rem;
		overflow: visible;
		border: 1px solid var(--open-border);
		border-radius: 0.25rem;
		background: var(--open-bg);
		color: var(--open-text);
		cursor: grab;
		touch-action: none;
	}
	.slot::before {
		content: '';
		position: absolute;
		inset: -0.3rem;
		z-index: 0;
	}
	.slot:active {
		cursor: grabbing;
	}
	.slot.draft {
		border-color: var(--draft-border);
		border-style: dashed;
		background: var(--draft-bg);
		color: var(--draft-text);
	}
	.slot.past {
		border-color: #aaa69d;
		background: #d9d6cf;
		color: #66625a;
		opacity: 0.58;
	}
	.slot.locked {
		border-color: var(--booked-border);
		background: var(--booked-bg);
		color: var(--booked-text);
		cursor: default;
	}
	.slot-label {
		position: relative;
		z-index: 1;
		display: grid;
		align-self: center;
		min-width: 0;
	}
	strong {
		padding-right: 1.25rem;
		font-size: 0.78rem;
	}
	.slot-label > span {
		font-size: 0.7rem;
		font-variant-numeric: tabular-nums;
	}
	.compact {
		align-content: center;
		padding-block: 0;
	}
	.compact .slot-label {
		display: flex;
		align-items: baseline;
		gap: 0.35rem;
		overflow: hidden;
		white-space: nowrap;
	}
	.compact strong {
		padding-right: 0;
	}
	.compact .slot-label > span {
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.resize {
		position: absolute;
		left: 50%;
		z-index: 2;
		width: min(8rem, 70%);
		height: 1rem;
		transform: translateX(-50%);
		padding: 0;
		border: 0;
		background: transparent;
		cursor: ns-resize;
		touch-action: none;
	}
	.resize span {
		position: absolute;
		left: 50%;
		display: block;
		width: 2.5rem;
		height: 2px;
		transform: translateX(-50%);
		border-radius: 1rem;
		background: currentColor;
		opacity: 0.7;
	}
	.top {
		bottom: 100%;
	}
	.bottom {
		top: 100%;
	}
	.top span {
		bottom: -1px;
	}
	.bottom span {
		top: -1px;
	}
	:global(html.extra-touch-leeway) .resize {
		width: min(12rem, 82%);
		height: 2.25rem;
	}
	.compact .resize span {
		width: 2.8rem;
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--surface) 45%, transparent);
		opacity: 0.9;
	}
	.remove {
		position: absolute;
		top: 50%;
		right: 0.22rem;
		transform: translateY(-50%);
		z-index: 4;
		width: 1.2rem;
		height: 1.2rem;
		padding: 0;
		border: 0;
		border-radius: 0.2rem;
		background: rgb(0 0 0 / 10%);
		color: inherit;
		font-size: 1rem;
		line-height: 1;
		cursor: pointer;
	}
	.remove:hover {
		background: rgb(0 0 0 / 20%);
	}
</style>
