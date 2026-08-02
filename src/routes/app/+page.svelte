<script lang="ts">
	import { resolve } from '$app/paths';
	let { data } = $props();

	const projects = [
		{ name: 'Libft', state: 'Ready to book' },
		{ name: 'ft_printf', state: 'Succeeded' },
		{ name: 'Born2beroot', state: 'In progress' }
	];
</script>

<svelte:head><title>Dashboard</title></svelte:head>

<main>
	<header><span>{data.user.login}</span><strong>Evaluation overview</strong></header>

	<section class="next-events" aria-label="Upcoming evaluations">
		<article>
			<span>Evaluating</span>
			<strong>peer_login</strong>
			<p>in 18 minutes</p>
		</article>
		<article>
			<span>Getting evaluated</span>
			<strong>Libft</strong>
			<p>in 1 hour 12 minutes</p>
		</article>
	</section>

	<section class="projects">
		<h2>Projects</h2>
		<ul>
			{#each projects as project (project.name)}
				<li><strong>{project.name}</strong><span>{project.state}</span></li>
			{/each}
		</ul>
	</section>
</main>

<nav class="primary-actions" aria-label="Primary actions">
	<a href={resolve('/app/open')}>Availability</a>
	<a class="primary" href={resolve('/app/evaluations')}>Book evaluation</a>
</nav>

<style>
	main {
		width: min(34rem, calc(100% - 2rem));
		margin: 0 auto;
		padding: 1.25rem 0 5.25rem;
	}
	header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	header span {
		color: var(--muted);
		font-size: 0.75rem;
	}
	.next-events {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.65rem;
	}
	article {
		min-width: 0;
		padding: 0.85rem;
		border: 1px solid var(--border);
		border-radius: 0.6rem;
		background: var(--surface);
	}
	article span,
	article p {
		margin: 0;
		color: var(--muted);
		font-size: 0.7rem;
	}
	article strong {
		display: block;
		margin: 0.35rem 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	article:first-child {
		border-top: 3px solid var(--foam);
	}
	article:last-child {
		border-top: 3px solid var(--iris);
	}
	.projects {
		margin-top: 1.25rem;
	}
	h2 {
		margin: 0 0 0.5rem;
		font-size: 0.85rem;
	}
	ul {
		margin: 0;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: 0.6rem;
		background: var(--surface);
		list-style: none;
	}
	li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 0.85rem;
		border-bottom: 1px solid var(--border);
		font-size: 0.82rem;
	}
	li:last-child {
		border-bottom: 0;
	}
	li span {
		color: var(--muted);
		text-align: right;
	}
	.primary-actions {
		position: fixed;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 80;
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.6rem 3.6rem 0.6rem 0.6rem;
		border-top: 1px solid var(--border);
		background: var(--surface);
	}
	.primary-actions a {
		display: grid;
		place-items: center;
		min-height: 2.5rem;
		padding: 0 0.9rem;
		border: 1px solid var(--border);
		border-radius: 0.45rem;
		background: var(--base);
		color: var(--text);
		font-size: 0.78rem;
		font-weight: 750;
		text-decoration: none;
	}
	.primary-actions .primary {
		border-color: var(--iris);
		background: var(--iris);
		color: var(--surface);
	}
	@media (max-width: 360px) {
		.next-events {
			grid-template-columns: 1fr;
		}
	}
</style>
