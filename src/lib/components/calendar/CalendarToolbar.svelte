<script lang="ts">
	import { onMount } from 'svelte';
	import { formatMinutes } from './calendar-math';
	import type { DayLayout, DraftSlot } from './calendar-types';

	let {
		dayLayout = $bindable(),
		pixelsPerHour = $bindable(),
		minimumDuration,
		onprevious,
		ontoday,
		onnext,
		draft,
		onconfirm,
		oncancel
	}: {
		dayLayout: DayLayout;
		pixelsPerHour: number;
		minimumDuration: number;
		onprevious: () => void;
		ontoday: () => void;
		onnext: () => void;
		draft: DraftSlot | null;
		onconfirm: () => void;
		oncancel: () => void;
	} = $props();

	let layoutMenu: HTMLDetailsElement;
	const layoutLabel = $derived(
		dayLayout === 'auto' ? 'Auto' : `${dayLayout} day${dayLayout === 1 ? '' : 's'}`
	);

	function selectLayout(value: DayLayout) {
		dayLayout = value;
		layoutMenu.open = false;
	}

	onMount(() => {
		const closeAway = (event: PointerEvent) => {
			if (layoutMenu.open && !layoutMenu.contains(event.target as Node)) layoutMenu.open = false;
		};
		document.addEventListener('pointerdown', closeAway);
		return () => document.removeEventListener('pointerdown', closeAway);
	});
</script>

<section class="toolbar" aria-label="Calendar controls">
	{#if draft}
		<div class="draft-control">
			<span>{formatMinutes(draft.startMinutes)}–{formatMinutes(draft.endMinutes)}</span>
			<button type="button" onclick={oncancel}>Cancel</button>
			<button type="button" class="confirm" onclick={onconfirm}>Add</button>
		</div>
	{/if}

	<div class="control-row">
		<nav aria-label="Date navigation">
			<button type="button" onclick={onprevious} aria-label="Previous days">←</button>
			<button type="button" class="today" onclick={ontoday}>Today</button>
			<button type="button" onclick={onnext} aria-label="Next days">→</button>
		</nav>

		<details class="layout-picker" bind:this={layoutMenu}>
			<summary>{layoutLabel}</summary>
			<div>
				<button type="button" onclick={() => selectLayout('auto')}>Automatic</button>
				<button type="button" onclick={() => selectLayout(1)}>1 day</button>
				<button type="button" onclick={() => selectLayout(2)}>2 days</button>
				<button type="button" onclick={() => selectLayout(3)}>3 days</button>
			</div>
		</details>

		<div class="zoom" aria-label="Timeline zoom">
			<button
				type="button"
				aria-label="Zoom out"
				onclick={() => (pixelsPerHour = Math.max(35, pixelsPerHour - 10))}>−</button
			>
			<button
				type="button"
				aria-label="Zoom in"
				onclick={() => (pixelsPerHour = Math.min(140, pixelsPerHour + 10))}>＋</button
			>
		</div>
	</div>
	<small>15 min grid · {minimumDuration} min campus minimum</small>
</section>

<style>
	.toolbar {
		display: grid;
		gap: 0.4rem;
		margin-bottom: 0.75rem;
	}
	.control-row,
	nav,
	.zoom,
	.draft-control {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
	}
	.control-row {
		gap: 0.5rem;
	}
	button,
	summary {
		display: grid;
		place-items: center;
		min-height: 2.25rem;
		padding: 0 0.65rem;
		border: 1px solid var(--border);
		border-radius: 0.45rem;
		background: var(--base);
		color: var(--text);
		font: inherit;
		font-size: 0.78rem;
		font-weight: 700;
		cursor: pointer;
	}
	.today {
		min-width: 4rem;
	}
	.layout-picker {
		position: relative;
	}
	summary {
		min-width: 4.8rem;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.layout-picker > div {
		position: absolute;
		right: 0;
		bottom: calc(100% + 0.35rem);
		z-index: 5;
		display: grid;
		gap: 0.2rem;
		width: 8rem;
		padding: 0.3rem;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background: var(--surface);
	}
	.layout-picker > div button {
		justify-content: start;
		border-color: transparent;
	}
	.zoom button {
		width: 2.25rem;
		padding: 0;
		font-size: 1rem;
	}
	.draft-control {
		padding: 0.35rem;
		border-radius: 0.5rem;
		background: var(--overlay);
	}
	.draft-control span {
		margin-right: 0.25rem;
		font-size: 0.82rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}
	.confirm {
		border-color: var(--iris);
		background: var(--iris);
		color: var(--surface);
	}
	.toolbar > small {
		color: var(--muted);
		font-size: 0.62rem;
		text-align: center;
	}
	@media (max-width: 520px) {
		.toolbar {
			position: fixed;
			right: 0;
			bottom: 0;
			left: 0;
			z-index: 50;
			margin: 0;
			padding: 0.45rem max(0.4rem, env(safe-area-inset-right))
				max(0.4rem, env(safe-area-inset-bottom)) max(0.4rem, env(safe-area-inset-left));
			border-top: 1px solid var(--border);
			background: var(--surface);
		}
		.control-row {
			gap: 0.35rem;
			padding-right: 3rem;
		}
		.draft-control {
			width: min(32rem, 100%);
			justify-self: center;
			box-sizing: border-box;
		}
		.toolbar > small {
			display: none;
		}
	}
	@media (max-width: 370px) {
		button,
		summary {
			padding: 0 0.45rem;
		}
		.today {
			min-width: 3.5rem;
		}
		summary {
			min-width: 4rem;
		}
	}
</style>
