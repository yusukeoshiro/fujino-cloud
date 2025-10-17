import { json } from '@sveltejs/kit';

export async function GET({ request, cookies }) {
	return json({});
}
