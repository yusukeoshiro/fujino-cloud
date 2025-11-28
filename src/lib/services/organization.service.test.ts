import { describe, it, expect, vi, beforeEach } from 'vitest';
import { organizationService } from './organization.service';
import { adminDb } from '../admin-firebase';

// Mock admin-firebase
vi.mock('../admin-firebase', () => {
	const mockCollection = {
		get: vi.fn(),
		doc: vi.fn(),
	};

	return {
		adminDb: {
			collection: vi.fn(() => mockCollection),
		},
	};
});

describe('OrganizationService', () => {
	const mockCollection = adminDb.collection('organizations');
	const mockDoc = {
		get: vi.fn(),
		set: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		id: 'new-id', // Add id to mock doc
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Setup default mocks
		(mockCollection.doc as any).mockReturnValue(mockDoc);

		(adminDb.collection as any).mockReturnValue(mockCollection);
	});

	it('should list organizations', async () => {
		const mockData = [{ id: '1', name: 'Org 1' }];
		const mockSnapshot = {
			docs: mockData.map((d) => ({
				id: d.id,
				data: () => ({ name: d.name }),
			})),
		};
		(mockCollection.get as any).mockResolvedValue(mockSnapshot);

		const result = await organizationService.list();
		expect(result).toEqual(mockData);
		expect(adminDb.collection).toHaveBeenCalledWith('organizations');
	});

	it('should create an organization', async () => {
		const input = { name: 'New Org' };

		// Ensure doc() returns an object with id
		(mockCollection.doc as any).mockReturnValue({
			...mockDoc,
			id: 'new-id',
		});

		const result = await organizationService.create(input);

		expect(result).toEqual({
			id: 'new-id',
			name: 'New Org',
			createdAt: expect.any(String),
		});
		expect(mockDoc.set).toHaveBeenCalledWith({
			id: 'new-id',
			name: 'New Org',
			createdAt: expect.any(String),
		});
	});

	it('should update an organization name', async () => {
		(mockDoc.get as any).mockResolvedValue({
			exists: true,
			id: '1',
			data: () => ({ name: 'Updated Org' }),
		});

		const result = await organizationService.updateName('1', 'Updated Org');

		expect(mockDoc.update).toHaveBeenCalledWith({ name: 'Updated Org' });
		expect(result.name).toBe('Updated Org');
	});

	it('should delete an organization', async () => {
		await organizationService.delete('1');
		expect(mockDoc.delete).toHaveBeenCalled();
	});
});
