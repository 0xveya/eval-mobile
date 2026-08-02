<script lang="ts">
	import { formatMinutes, slotHeight, slotTop } from './calendar-math';
	import type { CalendarSlot, DraftSlot } from './calendar-types';

	let {
		slot,
		id,
		draft = false,
		past = false,
		onmove,
		onresize,
		onremove
	}: {
		slot: CalendarSlot | DraftSlot;
		id: string;
		draft?: boolean;
		past?: boolean;
		onmove: (event: PointerEvent, element: HTMLElement) => void;
		onresize: (event: PointerEvent, edge: 'start' | 'end', element: HTMLElement) => void;
		onremove: (event: MouseEvent) => void;
	} = $props();

	const label = $derived(draft ? 'Draft' : (slot as CalendarSlot).label);
</script>

<div
	class="slot"
	class:draft
	class:past
	data-slot-id={id}
	role="group"
	aria-label={`${label}, draggable slot`}
	style={`top:${slotTop(slot.startMinutes)}%;height:${slotHeight(slot.startMinutes, slot.endMinutes)}%`}
	onpointerdown={(event) => onmove(event, event.currentTarget)}
>
	<button
		class="resize top"
		type="button"
		aria-label={`Resize start of ${label}`}
		onpointerdown={(event) => onresize(event, 'start', event.currentTarget)}><span></span></button
	>
	<button
		class="remove"
		type="button"
		aria-label={`Remove ${label}`}
		onpointerdown={(event) => event.stopPropagation()}
		onclick={onremove}>×</button
	>
	<strong>{label}</strong>
	<span>{formatMinutes(slot.startMinutes)}–{formatMinutes(slot.endMinutes)}</span>
	<button
		class="resize bottom"
		type="button"
		aria-label={`Resize end of ${label}`}
		onpointerdown={(event) => onresize(event, 'end', event.currentTarget)}><span></span></button
	>
</div>

<style>
	.slot {
		position: absolute;
		left: 0.3rem;
		right: 0.3rem;
		z-index: 3;
		display: grid;
		align-content: start;
		min-height: 1.8rem;
		padding: 0.42rem 0.5rem;
		overflow: hidden;
		border: 1px solid #26736b;
		border-radius: 0.25rem;
		background: #cce8e4;
		color: #173a36;
		cursor: grab;
		touch-action: none;
	}
	.slot:active {
		cursor: grabbing;
	}
	.slot.draft {
		border-color: #d4552d;
		border-style: dashed;
		background: #ffe1d2;
		color: #662612;
	}
	.slot.past {
		border-color: #aaa69d;
		background: #d9d6cf;
		color: #66625a;
		opacity: 0.58;
	}
	strong {
		padding-right: 1.25rem;
		font-size: 0.78rem;
	}
	.slot > span {
		font-size: 0.7rem;
		font-variant-numeric: tabular-nums;
	}
	.resize {
		position: absolute;
		left: 0;
		right: 0;
		z-index: 2;
		height: 0.85rem;
		padding: 0;
		border: 0;
		background: transparent;
		cursor: ns-resize;
		touch-action: none;
	}
	.resize span {
		display: block;
		width: 2.3rem;
		height: 3px;
		margin: auto;
		border-radius: 1rem;
		background: currentColor;
		opacity: 0.4;
	}
	.top {
		top: 0;
	}
	.bottom {
		bottom: 0;
	}
	.remove {
		position: absolute;
		top: 0.22rem;
		right: 0.22rem;
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
