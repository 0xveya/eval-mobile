<script lang="ts">
	let { mobile, ondismiss }: { mobile: boolean; ondismiss: () => void } = $props();
</script>

<div class="backdrop">
	<div class="panel" role="dialog" aria-modal="true" aria-labelledby="calendar-help-title">
		<small>Quick guide</small>
		<h2 id="calendar-help-title">Manage your open slots</h2>
		<ul>
			{#if mobile}
				<li>Press and hold empty time, then drag to create a slot.</li>
				<li>Drag a slot to move it. Drag just above or below its grip to resize.</li>
				<li>Pinch with two fingers to zoom the timeline.</li>
			{:else}
				<li>Click and drag empty time to create a slot.</li>
				<li>Drag a slot to move it, or use its top and bottom grips to resize.</li>
				<li>Use Ctrl + wheel to zoom around the pointer.</li>
			{/if}
		</ul>
		<button type="button" onclick={ondismiss}>Got it</button>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 180;
		display: grid;
		place-items: end center;
		padding: 1rem 1rem max(1rem, env(safe-area-inset-bottom));
		background: rgb(0 0 0 / 38%);
	}
	.panel {
		width: min(25rem, 100%);
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: 0.65rem;
		background: var(--surface);
		color: var(--text);
	}
	small {
		color: var(--iris);
		font-weight: 800;
	}
	h2 {
		margin: 0.2rem 0 0.65rem;
		font-size: 1.05rem;
	}
	ul {
		margin: 0 0 0.9rem;
		padding-left: 1.15rem;
		color: var(--subtle);
		font-size: 0.76rem;
		line-height: 1.5;
	}
	button {
		width: 100%;
		min-height: 2.5rem;
		border: 0;
		border-radius: 0.45rem;
		background: var(--iris);
		color: var(--surface);
		font: inherit;
		font-weight: 800;
	}
	@media (min-width: 700px) {
		.backdrop {
			place-items: center;
		}
	}
</style>
