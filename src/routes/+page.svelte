<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<main>
	<a href={resolve('/login')}>Sign in with 42</a>
</main>

<style>
	main {
		display: grid;
		min-height: 100dvh;
		place-items: center;
		padding: 1rem;
	}
	a {
		display: grid;
		min-width: 11rem;
		min-height: 3.25rem;
		place-items: center;
		border: 1px solid var(--iris);
		border-radius: 0.7rem;
		background: var(--iris);
		color: var(--surface);
		font-weight: 750;
		text-decoration: none;
		box-shadow: 0 0.55rem 1.4rem color-mix(in srgb, var(--iris) 24%, transparent);
		transition:
			transform 120ms ease,
			filter 120ms ease;
	}
	a:hover {
		filter: brightness(1.08);
		transform: translateY(-1px);
	}
	a:active {
		transform: translateY(1px);
	}
	a:focus-visible {
		outline: 3px solid var(--focus);
		outline-offset: 3px;
	}
</style>
