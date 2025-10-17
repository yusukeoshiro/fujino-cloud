<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<!-- 藤野クラウドへようこそ -->

<iframe
	src={data.iframeUrl}
	frameborder="0"
	height="1000"
	allowtransparency
	title="Embedded content"
	class=" w-full"
></iframe>
