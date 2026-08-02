<script lang="ts">
	import { onMount } from 'svelte';

	const storageKey = 'eval-mobile-theme';
	let dark = $state(false);

	onMount(() => {
		dark = document.documentElement.classList.contains('dark');
	});

	function toggleTheme() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		try {
			localStorage.setItem(storageKey, dark ? 'dark' : 'light');
		} catch {
			// The selected theme still applies for this page when storage is unavailable.
		}
	}
</script>

<button
	class="theme-toggle"
	type="button"
	aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
	title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
	onclick={toggleTheme}
>
	<svg class="moon" viewBox="0 0 24 24" aria-hidden="true">
		<path d="M21 15.4A9 9 0 0 1 8.6 3a7.5 7.5 0 1 0 12.4 12.4Z"></path>
	</svg>
	<svg class="sun" viewBox="0 0 24 24" aria-hidden="true">
		<circle cx="12" cy="12" r="4"></circle>
		<path
			d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
		></path>
	</svg>
	<span>{dark ? 'Light mode' : 'Dark mode'}</span>
</button>

<style>
	.theme-toggle {
		display: grid;
		place-items: center;
		width: 100%;
		height: 2.25rem;
		justify-content: start;
		grid-template-columns: 1.15rem 1fr;
		gap: 0.5rem;
		padding: 0 0.65rem;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background: transparent;
		color: var(--subtle);
		cursor: pointer;
	}
	span {
		font-size: 0.75rem;
		font-weight: 700;
	}
	.theme-toggle:hover,
	.theme-toggle:focus-visible {
		background: var(--hover);
		color: var(--iris);
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
	.sun {
		display: none;
	}
	:global(html.dark) .moon {
		display: none;
	}
	:global(html.dark) .sun {
		display: block;
	}
</style>
