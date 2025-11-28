import { describe, it, expect, vi, beforeEach } from 'vitest';
import { memberService } from './member.service';
import { adminDb } from '../admin-firebase';

// Mock admin-firebase
vi.mock('../admin-firebase', () => {
	const mockCollection = {
		where: vi.fn().mockReturnThis(),
		get: vi.fn(),
		doc: vi.fn(),
	};
	return {
		adminDb: {
			collection: vi.fn().mockReturnValue(mockCollection),
		},
	};
});

describe('MemberService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('listByOrgId', () => {
		it('should fetch members for a given orgId', async () => {
			const orgId = 'test-org';
			const mockMembers = [
				{ id: '1', orgId, userId: 'u1', name: 'Member 1' },
				{ id: '2', orgId, userId: 'u2', name: 'Member 2' },
			];

			const mockSnapshot = {
				docs: mockMembers.map((m) => ({
					data: () => m,
				})),
			};

			const collection = adminDb.collection('members');
			(collection.get as any).mockResolvedValue(mockSnapshot);

			const result = await memberService.listByOrgId(orgId);

			expect(adminDb.collection).toHaveBeenCalledWith('members');
			expect(collection.where).toHaveBeenCalledWith('orgId', '==', orgId);
			expect(collection.get).toHaveBeenCalled();
			expect(result).toEqual(mockMembers);
		});
	});

	describe('delete', () => {
		it('should delete member by id', async () => {
			const memberId = 'member-1';
			const mockDoc = {
				delete: vi.fn().mockResolvedValue(undefined),
			};

			const collection = adminDb.collection('members');
			(collection.doc as any).mockReturnValue(mockDoc);

			await memberService.delete(memberId);

			expect(adminDb.collection).toHaveBeenCalledWith('members');
			expect(collection.doc).toHaveBeenCalledWith(memberId);
			expect(mockDoc.delete).toHaveBeenCalled();
		});
	});
});
