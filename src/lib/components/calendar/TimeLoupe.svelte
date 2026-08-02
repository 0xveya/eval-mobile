<script lang="ts">
	import { formatMinutes } from './calendar-math';
	import type { Gesture } from './calendar-types';
	let { gesture }: { gesture: Gesture } = $props();
	const placeRight = $derived(gesture.fingerX < 130);
	const left = $derived(placeRight ? gesture.fingerX + 28 : gesture.fingerX - 132);
	const top = $derived(Math.max(8, gesture.fingerY - 72));
	const action = $derived(
		gesture.mode === 'create' ? 'Creating' : gesture.mode === 'move' ? 'Moving' : 'Resizing'
	);
</script>

<div
	class="time-loupe"
	class:right={placeRight}
	data-mode={gesture.mode}
	style={`left: ${left}px; top: ${top}px`}
	aria-live="polite"
>
	<span>{action}</span>
	<strong>{formatMinutes(gesture.currentMinutes)}</strong>
	<small>{gesture.currentDate}</small>
</div>

<style>
	.time-loupe {
		position: fixed;
		z-index: 100;
		display: grid;
		width: 6rem;
		padding: 0.4rem 0.55rem;
		border-left: 0.35rem solid #ef7650;
		border-radius: 0.35rem;
		background: #111;
		color: white;
		pointer-events: none;
		box-shadow: 0 2px 8px rgb(0 0 0 / 30%);
	}
	.time-loupe.right {
		border-right: 0.35rem solid #ef7650;
		border-left: 0;
	}
	.time-loupe[data-mode='move'] {
		border-color: #57bdb2;
	}
	.time-loupe[data-mode^='resize'] {
		border-color: #f0bd4d;
	}
	strong {
		font-size: 1.35rem;
		font-variant-numeric: tabular-nums;
	}
	span {
		font-size: 0.6rem;
		text-transform: uppercase;
		opacity: 0.7;
	}
	small {
		font-size: 0.62rem;
		opacity: 0.7;
	}
</style>
