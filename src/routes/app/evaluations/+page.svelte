<script lang="ts">
	type MockProject = {
		id: string;
		name: string;
		status: 'Ready to book';
		submitted: string;
	};

	const projects: MockProject[] = [
		{ id: 'libft', name: 'Libft', status: 'Ready to book', submitted: 'Submitted today' },
		{ id: 'minishell', name: 'minishell', status: 'Ready to book', submitted: 'Submitted today' }
	];

	let selectedId = $state(projects[0].id);
	let refreshedAt = $state('Not refreshed yet');
	let featureMessage = $state('');

	function refreshProjects() {
		refreshedAt = `Checked at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
		featureMessage = '';
	}

	function bookSelectedProject() {
		featureMessage = 'Feature not yet added.';
	}
</script>

<svelte:head><title>Evaluations</title></svelte:head>

<main>
	<header>
		<p>Projects</p>
		<h1>Book an evaluation</h1>
		<span>{refreshedAt}</span>
	</header>

	<fieldset>
		<legend>Select a project</legend>
		{#each projects as project (project.id)}
			<label class:selected={selectedId === project.id}>
				<input type="radio" name="project" value={project.id} bind:group={selectedId} />
				<span>
					<strong>{project.name}</strong>
					<small>{project.submitted}</small>
				</span>
				<b class="ready">{project.status}</b>
			</label>
		{/each}
	</fieldset>

	{#if featureMessage}<p class="notice" role="status">{featureMessage}</p>{/if}
</main>

<section class="page-actions" aria-label="Evaluation actions">
	<button type="button" onclick={refreshProjects}>Refresh</button>
	<button type="button" class="primary" onclick={bookSelectedProject}>Book a slot</button>
</section>

<style>
	main {
		width: min(34rem, calc(100% - 2rem));
		margin: 0 auto;
		padding: 1.5rem 0 5rem;
	}
	header p,
	header span {
		margin: 0;
		color: var(--muted);
		font-size: 0.72rem;
	}
	header p {
		font-weight: 800;
		text-transform: uppercase;
	}
	h1 {
		margin: 0.2rem 0 0.35rem;
		font-size: 1.5rem;
	}
	fieldset {
		display: grid;
		gap: 0.65rem;
		margin: 1.25rem 0 0;
		padding: 0;
		border: 0;
	}
	legend {
		margin-bottom: 0.5rem;
		color: var(--subtle);
		font-size: 0.8rem;
		font-weight: 700;
	}
	label {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.75rem;
		padding: 0.9rem;
		border: 1px solid var(--border);
		border-radius: 0.6rem;
		background: var(--surface);
	}
	label.selected {
		border-color: var(--iris);
		box-shadow: inset 0 0 0 1px var(--iris);
	}
	label > span {
		display: grid;
		gap: 0.15rem;
	}
	input {
		accent-color: var(--iris);
	}
	small {
		color: var(--muted);
	}
	label b {
		color: var(--foam);
		font-size: 0.7rem;
	}
	label b:not(.ready) {
		color: var(--subtle);
	}
	.notice {
		padding: 0.8rem;
		border: 1px solid var(--gold);
		border-radius: 0.5rem;
		background: color-mix(in srgb, var(--gold) 14%, transparent);
		color: var(--text);
		text-align: center;
	}
	.page-actions {
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
	button {
		min-height: 2.5rem;
		padding: 0 1rem;
		border: 1px solid var(--border);
		border-radius: 0.45rem;
		background: var(--base);
		color: var(--text);
		font-weight: 750;
	}
	.primary {
		border-color: var(--iris);
		background: var(--iris);
		color: var(--surface);
	}
</style>
