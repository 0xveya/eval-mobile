<script lang="ts">
	import { formatMinutes } from './calendar-math';
	import type { Gesture } from './calendar-types';
	let { gesture }: { gesture: Gesture } = $props();
	const left = $derived(Math.max(8, gesture.fingerX - 42));
	const top = $derived(Math.max(8, gesture.fingerY - 100));
</script>

<div class="time-loupe" style={`left: ${left}px; top: ${top}px`} aria-live="polite">
	<strong>{formatMinutes(gesture.currentMinutes)}</strong>
	<span>{gesture.currentDate}</span>
</div>

<style>
	.time-loupe {
		position: fixed;
		z-index: 100;
		display: grid;
		place-content: center;
		width: 5rem;
		height: 5rem;
		border: 2px solid white;
		border-radius: 50%;
		background: #222;
		color: white;
		text-align: center;
		pointer-events: none;
		box-shadow: 0 2px 8px rgb(0 0 0 / 30%);
	}
	strong {
		font-size: 1.05rem;
		font-variant-numeric: tabular-nums;
	}
	span {
		font-size: 0.68rem;
		opacity: 0.68;
	}
</style>
