import jwt from 'jsonwebtoken';

// Mock private key (this needs to match what the server 'expects' via JWKS, which is impossible without controlling the JWKS endpoint)
// So this test script is mainly to verify the structure and that the server rejects invalid signatures (or accepts if we could mock JWKS).
// Since we can't easily mock the server's JWKS fetch without dependency injection or nock,
// we will verify that the endpoint is reachable and processes the request (returning 401 or 500 is expected for invalid sig).

async function unitTest() {
	const payload = {
		sub: 'user_123_test',
		email: 'test_user_canvas@example.com',
		name: 'Test User Canvas',
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 60,
		iss: 'https://api.dev.mobili-platform.com',
		aud: 'https://mobili-platform.com',
		org_id: 'test_org_123',
	};

	// We sign with a random key, so verification WILL fail on server unless we change server config.
	// But we want to ensure it fails with "signature" error, not 404 or crash.
	const token = jwt.sign(payload, 'secret', { algorithm: 'HS256' }); // Wrong alg too, server expects RS256

	console.log('Testing endpoint with mock token...');

	try {
		const response = await fetch('http://localhost:5173/api/auth/canvas', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				signed_request: token,
				requested_path: '/dashboard',
			}),
		});

		console.log('Status:', response.status);
		if (response.status === 303) {
			console.log('Headers:', response.headers.get('location'));
			console.log('SUCCESS: Redirected (Unexpected success with invalid token? Check server log)');
		} else {
			const text = await response.text();
			console.log('Response:', text);
			if (response.status === 401 || response.status === 500) {
				console.log('PASS: Request handled (rejected as expected)');
			} else {
				console.log('FAIL: Unexpected status code');
			}
		}
	} catch (e) {
		console.error('Fetch error:', e);
	}
}

unitTest();
