import { error } from '@sveltejs/kit';
import { adminDb } from '../admin-firebase';
import type { OrganizationDto, CreateOrganizationDto } from './organization.dto';

const COLLECTION = 'organizations';

class OrganizationService {
	private collection() {
		return adminDb.collection(COLLECTION);
	}

	async list(): Promise<OrganizationDto[]> {
		const snapshot = await this.collection().get();
		return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }) as OrganizationDto);
	}

	async getById(id: string): Promise<OrganizationDto> {
		const doc = await this.collection().doc(id).get();
		if (!doc.exists) {
			throw error(404, `Organization with id ${id} not found`);
		}
		return { id: doc.id, ...doc.data() } as OrganizationDto;
	}

	async create(data: CreateOrganizationDto): Promise<OrganizationDto> {
		const ref = this.collection().doc(data.id);
		const snapshot = await ref.get();
		if (snapshot.exists) {
			throw error(409, `Organization with id ${data.id} already exists`);
		}

		const org: OrganizationDto = {
			id: data.id,
			name: data.name,
			createdAt: new Date().toISOString(),
		};
		await ref.set(org);
		return org;
	}

	async updateName(id: string, name: string): Promise<OrganizationDto> {
		const ref = this.collection().doc(id);
		await ref.update({ name });
		return await this.getById(id);
	}

	async delete(id: string): Promise<void> {
		await this.collection().doc(id).delete();
	}
}

export const organizationService = new OrganizationService();
