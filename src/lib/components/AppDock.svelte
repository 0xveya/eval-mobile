<script lang="ts">
	import { resolve } from '$app/paths';
	import ThemeToggle from './ThemeToggle.svelte';
</script>

<nav class="app-menu" aria-label="App menu">
	<details>
		<summary aria-label="Open app menu" title="Menu">
			<svg viewBox="0 0 24 24" aria-hidden="true"
				><circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle
					cx="19"
					cy="12"
					r="1"
				></circle></svg
			>
		</summary>
		<div class="menu">
			<a href={resolve('/app')}>
				<svg viewBox="0 0 24 24" aria-hidden="true"
					><path d="m3 11 9-8 9 8v10h-6v-6H9v6H3Z"></path></svg
				>
				Home
			</a>
			<ThemeToggle />
			<a href={resolve('/logout')}>
				<svg viewBox="0 0 24 24" aria-hidden="true"
					><path d="M10 5H4v14h6M14 8l4 4-4 4M8 12h10"></path></svg
				>
				Log out
			</a>
		</div>
	</details>
</nav>

<style>
	.app-menu {
		position: fixed;
		right: max(0.5rem, env(safe-area-inset-right));
		bottom: max(0.5rem, env(safe-area-inset-bottom));
		z-index: 120;
	}
	details {
		position: relative;
	}
	summary {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		border: 1px solid var(--border);
		border-radius: 0.55rem;
		background: var(--overlay);
		color: var(--text);
		cursor: pointer;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.menu {
		position: absolute;
		right: 0;
		bottom: calc(100% + 0.4rem);
		display: grid;
		gap: 0.2rem;
		width: 10rem;
		padding: 0.35rem;
		border: 1px solid var(--border);
		border-radius: 0.6rem;
		background: var(--surface);
		box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 22%);
	}
	a {
		display: grid;
		grid-template-columns: 1.15rem 1fr;
		align-items: center;
		gap: 0.5rem;
		height: 2.25rem;
		padding: 0 0.65rem;
		border-radius: 0.5rem;
		color: var(--subtle);
		font-size: 0.75rem;
		font-weight: 700;
		text-decoration: none;
	}
	a:hover,
	a:focus-visible {
		background: var(--hover);
		color: var(--iris);
	}
	svg {
		width: 1.1rem;
		height: 1.1rem;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.6;
	}
</style>
