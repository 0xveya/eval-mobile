<script lang="ts">
	import { getOpenSlots } from '$lib/remote/slots.remote';
	const slots = getOpenSlots();
</script>

<h1>Open slots</h1>

{#if await slots}
	<pre>{JSON.stringify(await slots, null, 2)}</pre>
{:else}
	<p>Loading slots…</p>
{/if}
