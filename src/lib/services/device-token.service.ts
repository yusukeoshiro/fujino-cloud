import { adminDb } from '../admin-firebase';

const COLLECTION = 'orgDeviceTokens';

type DeviceTokenDocument = {
	orgId: string;
	token: string;
	updatedAt: string;
};

class DeviceTokenService {
	private collection() {
		return adminDb.collection(COLLECTION);
	}

	async get(orgId: string): Promise<DeviceTokenDocument | null> {
		const doc = await this.collection().doc(orgId).get();
		if (!doc.exists) {
			return null;
		}
		return doc.data() as DeviceTokenDocument;
	}

	async set(orgId: string, token: string): Promise<DeviceTokenDocument> {
		const payload: DeviceTokenDocument = {
			orgId,
			token,
			updatedAt: new Date().toISOString(),
		};
		await this.collection().doc(orgId).set(payload, { merge: true });
		return payload;
	}

	async delete(orgId: string): Promise<void> {
		await this.collection().doc(orgId).delete();
	}
}

export const deviceTokenService = new DeviceTokenService();
