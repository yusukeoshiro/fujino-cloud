<script lang="ts">
	import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
	import { onMount } from 'svelte';
	import { auth } from '$lib/firebase';
	import { goto } from '$app/navigation';

	onMount(() => {
		if (isSignInWithEmailLink(auth, window.location.href)) {
			// Additional state parameters can also be passed via URL.
			// This can be used to continue the user's intended action before triggering
			// the sign-in operation.
			// Get the email if available. This should be available if the user completes
			// the flow on the same device where they started it.
			let email = window.localStorage.getItem('emailForSignIn');
			if (!email) {
				// User opened the link on a different device. To prevent session fixation
				// attacks, ask the user to provide the associated email again. For example:
				email = window.prompt(
					'ブラウザが変更されました。ログインしようとしたメールアドレスを入力してください。',
				);
			}
			// The client SDK will parse the code from the link for you.
			signInWithEmailLink(auth, email!, window.location.href)
				.then((result) => {
					// Clear email from storage.
					window.localStorage.removeItem('emailForSignIn');
					console.log(result);
					goto('/_/');
				})
				.catch((error) => {
					// Some error occurred, you can inspect the code: error.code
					// Common errors could be invalid email and invalid or expired OTPs.
				});
		}
	});
</script>
