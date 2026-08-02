<script lang="ts">
	import { resolve } from '$app/paths';
	import { env } from '$env/dynamic/public';
	import { onMount } from 'svelte';
	import { getBookableTeams, getUpcomingEvaluations } from '$lib/remote/account.remote';

	let { data } = $props();

	type Evaluation = {
		id: string;
		project: string;
		projectSlug: string;
		person: string;
		direction: 'outgoing' | 'incoming';
		beginAt: string;
	};

	const mockEvaluations: Evaluation[] = [
		{
			id: 'peer',
			project: 'minishell',
			projectSlug: '42cursus-minishell',
			person: 'peer_login',
			direction: 'outgoing',
			beginAt: new Date(Date.now() + 12 * 60_000).toISOString()
		},
		{
			id: 'libft',
			project: 'Libft',
			projectSlug: '42cursus-libft',
			person: 'evaluator42',
			direction: 'incoming',
			beginAt: new Date(Date.now() + 3 * 60_000).toISOString()
		}
	];
	const mockProjects = [
		{ id: 'libft', name: 'Libft' },
		{ id: 'minishell', name: 'minishell' }
	];
	const useMockData = env.PUBLIC_USE_MOCK_DATA === 'true';
	let evaluations = $state<Evaluation[]>(useMockData ? mockEvaluations : []);
	let projects = $state(useMockData ? mockProjects : []);
	let clock = $state(Date.now());
	function minutesUntil(beginAt: string) {
		return Math.max(0, Math.ceil((Date.parse(beginAt) - clock) / 60_000));
	}
	function shownPerson(evaluation: Evaluation) {
		if (minutesUntil(evaluation.beginAt) > 15) return 'Hidden until 15 min before';
		return evaluation.person;
	}
	function personIsVisible(evaluation: Evaluation) {
		return !shownPerson(evaluation).startsWith('Hidden');
	}
	async function refreshEvaluations() {
		try {
			const upcoming = await getUpcomingEvaluations();
			evaluations = upcoming.map((evaluation) => ({
				...evaluation,
				projectSlug:
					evaluation.projectSlug ?? (evaluation.projectId ? String(evaluation.projectId) : '')
			}));
		} catch {
			// Keep the last successful result during a temporary API failure.
		}
	}

	onMount(() => {
		const timer = window.setInterval(() => {
			clock = Date.now();
			if (!useMockData) void refreshEvaluations();
		}, 30_000);
		if (useMockData) return () => window.clearInterval(timer);
		void refreshEvaluations();
		void getBookableTeams()
			.then((teams) => {
				projects = teams.map((team) => ({ id: String(team.id), name: team.name }));
			})
			.catch(() => {
				projects = [];
			});
		return () => window.clearInterval(timer);
	});
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
					<p class="evaluation-sentence">
						{#if evaluation.direction === 'outgoing'}
							You will evaluate
							{#if personIsVisible(evaluation)}<a
									href="https://profile.intra.42.fr/users/{evaluation.person}"
									target="_blank"
									rel="noreferrer">{shownPerson(evaluation)}</a
								>{:else}<span>{shownPerson(evaluation)}</span>{/if}
						{:else}
							{#if personIsVisible(evaluation)}<a
									href="https://profile.intra.42.fr/users/{evaluation.person}"
									target="_blank"
									rel="noreferrer">{shownPerson(evaluation)}</a
								>{:else}<span>{shownPerson(evaluation)}</span>{/if}
							will evaluate you
						{/if}
						on
						{#if evaluation.projectSlug}<a
								href="https://projects.intra.42.fr/projects/{evaluation.projectSlug}"
								target="_blank"
								rel="noreferrer">{evaluation.project}</a
							>{:else}<strong>{evaluation.project}</strong>{/if}
						in <b>{minutesUntil(evaluation.beginAt)} min</b>.
					</p>
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
			{#if projects.length === 0}<li class="empty">No projects are ready to book.</li>{/if}
		</ul>
	</section>
</main>

<nav class="primary-actions" aria-label="Primary actions">
	<a href={resolve('/app/open')}>Manage slots</a>
</nav>

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
	header span {
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
	.evaluation-list li:not(.empty) {
		display: grid;
		grid-template-columns: 0.25rem minmax(0, 1fr);
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
	.evaluation-sentence {
		min-width: 0;
		margin: 0;
		font-size: 0.8rem;
		line-height: 1.45;
	}
	.evaluation-sentence a {
		color: var(--text);
		font-weight: 750;
		text-decoration-color: var(--border);
		text-underline-offset: 0.15rem;
	}
	.evaluation-sentence a:first-of-type {
		color: var(--iris);
	}
	.projects a {
		color: var(--iris);
		font-size: 0.68rem;
		font-weight: 750;
		text-decoration: none;
	}
	.empty {
		display: block;
		width: 100%;
		box-sizing: border-box;
		padding: 0.9rem 1rem;
		color: var(--muted);
		font-size: 0.75rem;
		line-height: 1.4;
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
		padding: 0.5rem 3.5rem;
		border-top: 1px solid var(--border);
		background: var(--surface);
	}
	.primary-actions a {
		display: grid;
		place-items: center;
		min-height: 2.5rem;
		padding: 0 1rem;
		border: 1px solid var(--iris);
		border-radius: 0.45rem;
		background: var(--iris);
		color: var(--surface);
		font-size: 0.78rem;
		font-weight: 750;
		text-decoration: none;
	}
</style>
