<script lang="ts">
	import { onMount } from 'svelte';

	const storageKey = 'eval-mobile-touch-leeway';
	let enabled = $state(false);

	onMount(() => {
		enabled = document.documentElement.classList.contains('extra-touch-leeway');
	});

	function toggleLeeway() {
		enabled = !enabled;
		document.documentElement.classList.toggle('extra-touch-leeway', enabled);
		try {
			localStorage.setItem(storageKey, enabled ? 'on' : 'off');
		} catch {
			// The setting still applies until the page is closed.
		}
	}
</script>

<button
	type="button"
	class:enabled
	aria-pressed={enabled}
	aria-label="Toggle extra slot resize leeway"
	onclick={toggleLeeway}
>
	<svg viewBox="0 0 24 24" aria-hidden="true">
		<path d="m8 7 4-4 4 4M12 3v7M8 17l4 4 4-4M12 21v-7"></path>
	</svg>
	<span>Touch leeway</span>
</button>

<style>
	button {
		display: grid;
		grid-template-columns: 1.15rem 1fr;
		align-items: center;
		justify-items: start;
		gap: 0.5rem;
		width: 100%;
		height: 2.25rem;
		padding: 0 0.65rem;
		border: 0;
		border-radius: 0.5rem;
		background: transparent;
		color: var(--subtle);
		cursor: pointer;
	}
	button:hover,
	button:focus-visible,
	button.enabled {
		background: var(--hover);
		color: var(--iris);
	}
	span {
		font-size: 0.75rem;
		font-weight: 700;
		white-space: nowrap;
	}
	svg {
		width: 1.15rem;
		height: 1.15rem;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.7;
	}
</style>
