<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import AppDock from '$lib/components/AppDock.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
<AppDock />

<style>
	:global(:root) {
		color-scheme: light;
		--app-menu-space: calc(3.5rem + env(safe-area-inset-bottom));
		--base: #eff1f5;
		--surface: #e6e9ef;
		--overlay: #ccd0da;
		--text: #4c4f69;
		--subtle: #5c5f77;
		--muted: #9ca0b0;
		--love: #d20f39;
		--gold: #df8e1d;
		--rose: #ea76cb;
		--pine: #1e66f5;
		--foam: #179299;
		--iris: #8839ef;
		--border: #bcc0cc;
		--hover: rgb(234 118 203 / 16%);
		--focus: #ea76cb;
		--page: var(--base);
		--surface-muted: var(--surface);
		--grid: var(--border);
		--open-bg: color-mix(in srgb, var(--foam) 22%, var(--base));
		--open-border: var(--foam);
		--open-text: var(--text);
		--draft-bg: color-mix(in srgb, var(--gold) 22%, var(--base));
		--draft-border: var(--gold);
		--draft-text: var(--text);
		--booked-bg: color-mix(in srgb, var(--love) 20%, var(--base));
		--booked-border: var(--love);
		--booked-text: var(--text);
	}
	:global(:root.dark) {
		color-scheme: dark;
		--base: #1e1e2e;
		--surface: #181825;
		--overlay: #313244;
		--text: #cdd6f4;
		--subtle: #bac2de;
		--muted: #6c7086;
		--love: #f38ba8;
		--gold: #f9e2af;
		--rose: #f5c2e7;
		--pine: #89b4fa;
		--foam: #94e2d5;
		--iris: #cba6f7;
		--border: #45475a;
		--hover: rgb(245 194 231 / 16%);
		--focus: #f5c2e7;
	}
	:global(*) {
		box-sizing: border-box;
	}
	:global(body) {
		margin: 0;
		min-height: 100dvh;
		background: var(--page);
		color: var(--text);
		font-family: sans-serif;
	}
</style>
