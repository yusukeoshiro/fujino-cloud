import { createHash, randomBytes } from 'crypto';
import { adminDb } from '../admin-firebase';

const COLLECTION = 'orgContentsProviderApiTokens';

type ContentsProviderApiTokenDocument = {
	orgId: string;
	tokenHash: string;
	lastFour: string;
	createdAt: string;
	updatedAt: string;
};

class ContentsProviderApiTokenService {
	private collection() {
		return adminDb.collection(COLLECTION);
	}

	private hashToken(token: string) {
		return createHash('sha256').update(token).digest('hex');
	}

	private generateToken() {
		return `cp_${randomBytes(32).toString('base64url')}`;
	}

	async get(orgId: string): Promise<ContentsProviderApiTokenDocument | null> {
		const snapshot = await this.collection().doc(orgId).get();
		if (!snapshot.exists) {
			return null;
		}
		return snapshot.data() as ContentsProviderApiTokenDocument;
	}

	async issue(orgId: string) {
		const token = this.generateToken();
		const tokenHash = this.hashToken(token);
		const now = new Date().toISOString();

		const payload: ContentsProviderApiTokenDocument = {
			orgId,
			tokenHash,
			lastFour: token.slice(-4),
			createdAt: now,
			updatedAt: now,
		};

		await this.collection().doc(orgId).set(payload, { merge: true });

		return { token, payload };
	}

	async delete(orgId: string): Promise<void> {
		await this.collection().doc(orgId).delete();
	}

	async verify(rawToken: string): Promise<ContentsProviderApiTokenDocument | null> {
		const tokenHash = this.hashToken(rawToken);
		const snapshot = await this.collection().where('tokenHash', '==', tokenHash).limit(1).get();
		if (snapshot.empty) {
			return null;
		}
		const doc = snapshot.docs[0];
		return doc.data() as ContentsProviderApiTokenDocument;
	}
}

export const contentsProviderApiTokenService = new ContentsProviderApiTokenService();
