<script lang="ts">
	import { getBookableTeams } from '$lib/remote/account.remote';
	import { resolve } from '$app/paths';

	let { data } = $props();
	const teams = getBookableTeams();
</script>

<h1>{data.user.login}</h1>

{#if await teams}
	<pre>{JSON.stringify(await teams, null, 2)}</pre>
{:else}
	<p>Loading teams…</p>
{/if}

<a href="/app/open">Open slot</a>

<a href={resolve('/logout')}>Log out</a>
