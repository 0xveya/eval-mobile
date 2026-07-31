<script lang="ts">
	let { data } = $props();
</script>

<h1>{data.user.login}</h1>

<ul>
	<li><a href="/app/evals">My evals</a></li>
	<li><a href="/app/book">Book eval</a></li>
	<li><a href="/app/slots">My slots</a></li>
</ul>

<a href="/logout">Log out</a>
