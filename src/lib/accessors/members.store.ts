import { writable } from 'svelte/store';
import type { MemberDto } from '../services/member.dto';

export const currentMembers = writable<MemberDto[]>([]);
