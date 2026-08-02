<script lang="ts">
	import { resolve } from '$app/paths';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

	let { data } = $props();

	type Evaluation = {
		id: string;
		project: string;
		person: string;
		direction: 'outgoing' | 'incoming';
		minutes: number;
	};

	let evaluations = $state<Evaluation[]>([
		{ id: 'peer', project: 'minishell', person: 'peer_login', direction: 'outgoing', minutes: 12 },
		{ id: 'libft', project: 'Libft', person: 'evaluator42', direction: 'incoming', minutes: 3 }
	]);
	let cancelId = $state<string | null>(null);
	const intraUrl = 'https://projects.intra.42.fr/';

	const projects = [
		{ id: 'libft', name: 'Libft' },
		{ id: 'minishell', name: 'minishell' }
	];

	function cancelEvaluation() {
		evaluations = evaluations.filter((evaluation) => evaluation.id !== cancelId);
		cancelId = null;
	}
</script>

<svelte:head><title>Dashboard</title></svelte:head>

<main>
	<header>
		<span>{data.user.login}</span>
		<h1>Evaluation overview</h1>
	</header>

	<section aria-labelledby="upcoming-heading">
		<h2 id="upcoming-heading">Up next</h2>
		<ul class="evaluation-list">
			{#each evaluations as evaluation (evaluation.id)}
				<li class:incoming={evaluation.direction === 'incoming'}>
					<span class="marker" aria-hidden="true"></span>
					<div>
						<strong>{evaluation.project}</strong>
						<small>
							{evaluation.direction === 'outgoing'
								? `You evaluate ${evaluation.person}`
								: `${evaluation.person} evaluates you`}
						</small>
					</div>
					<div class="event-actions">
						<b>in {evaluation.minutes} min</b>
						{#if evaluation.minutes <= 15}
							<a href={intraUrl} target="_blank" rel="noreferrer">Open Intra ↗</a>
						{/if}
					</div>
					{#if evaluation.direction === 'incoming' && evaluation.minutes <= 4}
						<button class="cancel" type="button" onclick={() => (cancelId = evaluation.id)}
							>Cancel</button
						>
					{/if}
				</li>
			{/each}
			{#if evaluations.length === 0}<li class="empty">No upcoming evaluations.</li>{/if}
		</ul>
	</section>

	<section class="projects" aria-labelledby="projects-heading">
		<h2 id="projects-heading">Ready to book</h2>
		<ul>
			{#each projects as project (project.id)}
				<li>
					<strong>{project.name}</strong>
					<a href={resolve(`/app/evaluations?project=${project.id}`)}>Book evaluation</a>
				</li>
			{/each}
		</ul>
	</section>
</main>

<nav class="primary-actions" aria-label="Primary actions">
	<a href={resolve('/app/open')}>Manage slots</a>
</nav>

{#if cancelId}
	<ConfirmDialog
		title="Cancel evaluation?"
		message="This removes the scheduled evaluation."
		confirmLabel="Cancel evaluation"
		onconfirm={cancelEvaluation}
		oncancel={() => (cancelId = null)}
	/>
{/if}

<style>
	main {
		width: min(34rem, calc(100% - 1.25rem));
		margin: 0 auto;
		padding: 1rem 0 5rem;
	}
	header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.1rem;
	}
	header span,
	small {
		color: var(--muted);
	}
	header span {
		font-size: 0.72rem;
	}
	h1 {
		margin: 0;
		font-size: 1.15rem;
	}
	h2 {
		margin: 0 0 0.45rem;
		font-size: 0.78rem;
		color: var(--subtle);
	}
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
		border: 1px solid var(--border);
		border-radius: 0.6rem;
		background: var(--surface);
		overflow: hidden;
	}
	li {
		border-bottom: 1px solid var(--border);
	}
	li:last-child {
		border-bottom: 0;
	}
	.evaluation-list li {
		display: grid;
		grid-template-columns: 0.25rem minmax(0, 1fr) auto auto;
		align-items: center;
		gap: 0.65rem;
		min-height: 3.75rem;
		padding: 0.55rem 0.7rem 0.55rem 0;
	}
	.marker {
		align-self: stretch;
		border-radius: 0 0.2rem 0.2rem 0;
		background: var(--foam);
	}
	.incoming .marker {
		background: var(--iris);
	}
	.evaluation-list strong,
	.evaluation-list small {
		display: block;
	}
	.evaluation-list strong {
		font-size: 0.85rem;
	}
	small {
		margin-top: 0.12rem;
		font-size: 0.68rem;
	}
	.event-actions {
		display: grid;
		justify-items: end;
		gap: 0.15rem;
		white-space: nowrap;
	}
	.event-actions b {
		font-size: 0.7rem;
	}
	.event-actions a,
	.projects a {
		color: var(--iris);
		font-size: 0.68rem;
		font-weight: 750;
		text-decoration: none;
	}
	button.cancel {
		min-height: 2.15rem;
		padding: 0 0.55rem;
		border: 1px solid var(--love);
		border-radius: 0.4rem;
		background: transparent;
		color: var(--love);
		font: inherit;
		font-size: 0.68rem;
		font-weight: 750;
	}
	.empty {
		padding: 1rem;
		color: var(--muted);
		font-size: 0.75rem;
	}
	.projects {
		margin-top: 1.2rem;
	}
	.projects li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 0.8rem;
		font-size: 0.8rem;
	}
	.projects a {
		display: grid;
		place-items: center;
		min-height: 2.15rem;
		padding: 0 0.65rem;
		border: 1px solid var(--iris);
		border-radius: 0.4rem;
	}
	.primary-actions {
		position: fixed;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 80;
		display: flex;
		justify-content: center;
		padding: 0.5rem 3.5rem 0.5rem 0.5rem;
		border-top: 1px solid var(--border);
		background: var(--surface);
	}
	.primary-actions a {
		display: grid;
		place-items: center;
		min-height: 2.5rem;
		padding: 0 1rem;
		border: 1px solid var(--border);
		border-radius: 0.45rem;
		background: var(--base);
		color: var(--text);
		font-size: 0.78rem;
		font-weight: 750;
		text-decoration: none;
	}
	@media (max-width: 390px) {
		.evaluation-list li {
			grid-template-columns: 0.25rem minmax(0, 1fr) auto;
		}
		button.cancel {
			grid-column: 2 / -1;
			justify-self: end;
			margin-top: -0.25rem;
		}
	}
</style>
