<script lang="ts">
	let {
		title,
		message,
		confirmLabel = 'Confirm',
		onconfirm,
		oncancel
	}: {
		title: string;
		message: string;
		confirmLabel?: string;
		onconfirm: () => void;
		oncancel: () => void;
	} = $props();
</script>

<div class="backdrop">
	<div
		class="dialog"
		role="alertdialog"
		aria-modal="true"
		aria-labelledby="confirm-title"
		aria-describedby="confirm-message"
	>
		<h2 id="confirm-title">{title}</h2>
		<p id="confirm-message">{message}</p>
		<div class="actions">
			<button type="button" onclick={oncancel}>Keep it</button>
			<button type="button" class="danger" onclick={onconfirm}>{confirmLabel}</button>
		</div>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: grid;
		place-items: center;
		padding: 1rem;
		background: rgb(0 0 0 / 35%);
	}
	.dialog {
		width: min(22rem, 100%);
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: 0.4rem;
		background: var(--surface);
		color: var(--text);
	}
	h2 {
		margin: 0 0 0.4rem;
		font-size: 1.05rem;
	}
	p {
		margin: 0 0 1rem;
		color: var(--muted);
		font-size: 0.9rem;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}
	button {
		min-height: 2.4rem;
		padding: 0 0.8rem;
		border: 1px solid var(--border);
		border-radius: 0.25rem;
		background: var(--surface);
		color: var(--text);
		font-weight: 700;
	}
	.danger {
		border-color: #9d2020;
		background: #9d2020;
		color: white;
	}
</style>
