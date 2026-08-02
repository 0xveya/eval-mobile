<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head><title>Book an evaluation</title></svelte:head>

<main>
	<p>Booking</p>
	<h1>Not implemented yet</h1>
	<span>Evaluation booking will be available here soon.</span>
</main>

<nav aria-label="Page actions">
	<a href={resolve('/app')}>Back to overview</a>
</nav>

<style>
	main {
		width: min(30rem, calc(100% - 2rem));
		margin: 0 auto;
		padding: 2rem 0 5rem;
	}
	p,
	span {
		margin: 0;
		color: var(--muted);
		font-size: 0.76rem;
	}
	h1 {
		margin: 0.25rem 0 0.4rem;
		font-size: 1.35rem;
	}
	nav {
		position: fixed;
		right: 0;
		bottom: 0;
		left: 0;
		display: flex;
		justify-content: center;
		padding: 0.5rem 3.5rem;
		border-top: 1px solid var(--border);
		background: var(--surface);
	}
	a {
		display: grid;
		place-items: center;
		min-height: 2.5rem;
		padding: 0 1rem;
		border-radius: 0.45rem;
		background: var(--iris);
		color: var(--surface);
		font-size: 0.78rem;
		font-weight: 750;
		text-decoration: none;
	}
</style>
