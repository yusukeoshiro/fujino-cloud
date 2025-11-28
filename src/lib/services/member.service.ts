import { error } from '@sveltejs/kit';
import { adminDb } from '../admin-firebase';

import type { CreateMemberDto, MemberDto } from './member.dto';

class MemberService {
	async getById(id: string) {
		const snapshot = await adminDb.collection('members').doc(id).get();
		if (!snapshot.exists) {
			throw error(404, `member with id ${id} not found`);
		}

		return snapshot.data() as MemberDto;
	}

	async create(data: CreateMemberDto) {
		// check for duplicate
		const snapshot = await adminDb
			.collection('members')
			.where('userId', '==', data.userId)
			.where('orgId', '==', data.orgId)
			.get();

		if (!snapshot.empty) {
			throw error(409, 'already exists');
		}

		const ref = adminDb.collection('members').doc();
		await ref.set({
			id: ref.id,
			...data,
		});

		return await this.getById(ref.id);
	}

	async listByUserId(userId: string): Promise<MemberDto[]> {
		const snapshot = await adminDb.collection('members').where('userId', '==', userId).get();

		return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot<MemberDto>) =>
			doc.data(),
		);
	}

	async listByOrgId(orgId: string): Promise<MemberDto[]> {
		const snapshot = await adminDb.collection('members').where('orgId', '==', orgId).get();

		return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot<MemberDto>) =>
			doc.data(),
		);
	}

	async delete(id: string) {
		await adminDb.collection('members').doc(id).delete();
	}
}

export const memberService = new MemberService();
