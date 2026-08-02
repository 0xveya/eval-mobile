<script lang="ts">
	import { formatMinutes } from './calendar-math';
	import type { DayLayout, DraftSlot } from './calendar-types';

	let {
		dayLayout = $bindable(),
		snapMinutes = $bindable(),
		pixelsPerHour = $bindable(),
		onprevious,
		ontoday,
		onnext,
		draft,
		onconfirm,
		oncancel
	}: {
		dayLayout: DayLayout;
		snapMinutes: number;
		pixelsPerHour: number;
		onprevious: () => void;
		ontoday: () => void;
		onnext: () => void;
		draft: DraftSlot | null;
		onconfirm: () => void;
		oncancel: () => void;
	} = $props();
</script>

<section class="toolbar" aria-label="Calendar controls">
	<nav aria-label="Date navigation">
		<button type="button" onclick={onprevious} aria-label="Previous days">←</button>
		<button type="button" class="today" onclick={ontoday}>Today</button>
		<button type="button" onclick={onnext} aria-label="Next days">→</button>
	</nav>

	<div class="settings">
		<label>
			<span>Days</span>
			<select bind:value={dayLayout}>
				<option value="auto">Automatic</option>
				<option value={1}>1 day</option>
				<option value={2}>2 days</option>
				<option value={3}>3 days</option>
			</select>
		</label>
		<label>
			<span>Snap</span>
			<select bind:value={snapMinutes}>
				<option value={5}>5 min</option>
				<option value={10}>10 min</option>
				<option value={15}>15 min</option>
				<option value={30}>30 min</option>
			</select>
		</label>
		<label class="zoom">
			<span>Zoom · {pixelsPerHour}px</span>
			<input type="range" min="35" max="140" step="5" bind:value={pixelsPerHour} />
		</label>
	</div>

	{#if draft}
		<div class="draft-control">
			<span>{formatMinutes(draft.startMinutes)}–{formatMinutes(draft.endMinutes)}</span>
			<button type="button" onclick={oncancel}>Cancel</button>
			<button type="button" class="confirm" onclick={onconfirm}>Add</button>
		</div>
	{/if}
</section>

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	nav {
		display: flex;
		gap: 0.35rem;
	}
	button,
	select {
		min-height: 2rem;
		border: 1px solid #aaa;
		border-radius: 0.25rem;
		background: #fff;
		color: #222;
	}
	button {
		min-width: 2rem;
		padding: 0 0.5rem;
		cursor: pointer;
		font-weight: 700;
	}
	button:hover {
		border-color: #26241f;
	}
	.today {
		min-width: 4rem;
	}
	.settings {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: 0.7rem;
	}
	.draft-control {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.draft-control span {
		font-size: 0.8rem;
		font-weight: 700;
	}
	.confirm {
		background: #222;
		color: white;
	}
	label {
		display: grid;
		gap: 0.25rem;
		color: #555;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	select {
		padding: 0 0.65rem;
		font: inherit;
		font-size: 0.8rem;
		letter-spacing: 0;
		text-transform: none;
	}
	.zoom {
		min-width: 9rem;
	}
	input {
		accent-color: #26736b;
	}
	@media (max-width: 520px) {
		.toolbar {
			position: fixed;
			right: 0;
			bottom: 0;
			left: 0;
			z-index: 50;
			justify-content: center;
			gap: 0.4rem 0.75rem;
			margin: 0;
			padding: 0.5rem;
			border-top: 1px solid #aaa;
			background: #fff;
		}
		.settings {
			gap: 0.4rem;
		}
		.zoom {
			display: none;
		}
		label > span {
			display: none;
		}
		.draft-control {
			width: 100%;
			justify-content: center;
			order: -1;
		}
	}
</style>
