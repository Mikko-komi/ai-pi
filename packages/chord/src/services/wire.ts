/**
 * Chord-owned service wire grammar and `$chord.service` control calls.
 *
 * 服务线语法。适配器先落到严格 JSON，再用这些 parse；Chord 不规定外层信封。
 */

import { assertValidOp, assertValidWireOp, type WireOp } from "../delta/index.ts";
import type {
	ServiceCall,
	ServiceCatalogueEntry,
	ServiceInstanceAddress,
	ServiceMode,
	ServiceProviderUpdate,
	ServiceSubscriptionSnapshot,
} from "../types.ts";

/**
 * Wire form of a member snapshot: methods, or state with encoded {@link WireOp}s.
 *
 * 线上成员快照。和内存版的差别只在 state ops 是 WireOp。
 */
export type WireServiceMemberSnapshot =
	| { readonly name: string; readonly kind: "method" }
	| { readonly name: string; readonly kind: "state"; readonly sequence: number; readonly ops: readonly WireOp[] };

/**
 * Wire form of one instance snapshot.
 *
 * 线上实例快照。singleton 无地址；keyed 必须带地址。
 */
export type WireServiceInstanceSnapshot = {
	readonly instance?: ServiceInstanceAddress;
	readonly members: readonly WireServiceMemberSnapshot[];
};

/**
 * Wire form of a subscription opening snapshot.
 *
 * 线上订阅快照。解码前不能交给 apply。
 */
export type WireServiceSubscriptionSnapshot = {
	readonly serviceId: string;
	readonly mode: ServiceMode;
	readonly instances: readonly WireServiceInstanceSnapshot[];
};

/**
 * Wire form of a provider update after subscribe.
 *
 * 线上增量。state 的 ops 是 WireOp；语义与内存版相同。
 */
export type WireServiceProviderUpdate =
	| {
			readonly type: "state";
			readonly instance?: ServiceInstanceAddress;
			readonly member: string;
			readonly sequence: number;
			readonly ops: readonly WireOp[];
	  }
	| { readonly type: "unavailable" }
	| { readonly type: "replaced"; readonly snapshot: WireServiceInstanceSnapshot }
	| { readonly type: "spawned"; readonly instance: WireServiceInstanceSnapshot }
	| { readonly type: "closed"; readonly instance: ServiceInstanceAddress };

const SERVICE_CONTROL_ID = "$chord.service";
const SERVICE_CATALOGUE_MEMBER = "catalogue";
const SERVICE_SUBSCRIBE_MEMBER = "subscribe";
const SERVICE_UNSUBSCRIBE_MEMBER = "unsubscribe";

/**
 * Decoded `$chord.service` control call: catalogue, subscribe, or unsubscribe.
 *
 * 控制面调用。普通业务 call 解不出来则不是控制调用。
 */
export type ServiceControlCall =
	| { readonly type: "catalogue" }
	| {
			readonly type: "subscribe";
			readonly subscriptionId: string;
			readonly serviceId: string;
			readonly mode: ServiceMode;
	  }
	| { readonly type: "unsubscribe"; readonly subscriptionId: string };

/**
 * Build the reserved catalogue control call.
 *
 * 列出远端目录的控制调用。无 args、无 instance。
 */
export function createServiceCatalogueCall(): ServiceCall {
	return { serviceId: SERVICE_CONTROL_ID, member: SERVICE_CATALOGUE_MEMBER, args: [] };
}

/**
 * Build the reserved subscribe control call for one service and mode.
 *
 * 打开一条订阅。subscriptionId 由适配器分配且必须在该 endpoint 内唯一。
 */
export function createServiceSubscribeCall(subscriptionId: string, serviceId: string, mode: ServiceMode): ServiceCall {
	return { serviceId: SERVICE_CONTROL_ID, member: SERVICE_SUBSCRIBE_MEMBER, args: [subscriptionId, serviceId, mode] };
}

/**
 * Build the reserved unsubscribe control call.
 *
 * 关闭一条订阅。只认 subscriptionId。
 */
export function createServiceUnsubscribeCall(subscriptionId: string): ServiceCall {
	return { serviceId: SERVICE_CONTROL_ID, member: SERVICE_UNSUBSCRIBE_MEMBER, args: [subscriptionId] };
}

/**
 * Decode a `$chord.service` control call, or undefined if the call is ordinary.
 *
 * 认出控制调用。带 instance、错成员或错 arity 都当非控制，返回 undefined。
 */
export function decodeServiceControlCall(call: ServiceCall): ServiceControlCall | undefined {
	if (call.serviceId !== SERVICE_CONTROL_ID || call.instance !== undefined) return undefined;
	if (call.member === SERVICE_CATALOGUE_MEMBER && call.args.length === 0) return { type: "catalogue" };
	if (
		call.member === SERVICE_SUBSCRIBE_MEMBER &&
		call.args.length === 3 &&
		isId(call.args[0]) &&
		isId(call.args[1]) &&
		(call.args[2] === "singleton" || call.args[2] === "keyed")
	) {
		return {
			type: "subscribe",
			subscriptionId: call.args[0],
			serviceId: call.args[1],
			mode: call.args[2],
		};
	}
	if (call.member === SERVICE_UNSUBSCRIBE_MEMBER && call.args.length === 1 && isId(call.args[0])) {
		return { type: "unsubscribe", subscriptionId: call.args[0] };
	}
	return undefined;
}

/**
 * Validate a strict-JSON value as a {@link ServiceCall}.
 *
 * 校验一次业务或控制调用。多字段、空 id、非数组 args 都抛。
 */
export function parseServiceCall(value: unknown): ServiceCall {
	const call = record(value, "service call");
	assertKeys(call, ["serviceId", "member", "args"], ["instance"], "service call");
	if (!isId(call.serviceId) || !isId(call.member) || !Array.isArray(call.args)) {
		throw new TypeError("Invalid service call");
	}
	if (call.instance !== undefined) assertAddress(call.instance);
	return value as ServiceCall;
}

/**
 * Validate a strict-JSON value as a catalogue with unique service ids.
 *
 * 校验目录。重复 serviceId 或非法 mode 都抛。
 */
export function parseServiceCatalogue(value: unknown): readonly ServiceCatalogueEntry[] {
	if (!Array.isArray(value)) throw new TypeError("Invalid service catalogue");
	const ids = new Set<string>();
	for (const candidate of value) {
		const entry = record(candidate, "service catalogue entry");
		assertKeys(entry, ["serviceId", "mode"], [], "service catalogue entry");
		if (!isId(entry.serviceId) || !isMode(entry.mode) || ids.has(entry.serviceId)) {
			throw new TypeError("Invalid service catalogue");
		}
		ids.add(entry.serviceId);
	}
	return value as unknown as readonly ServiceCatalogueEntry[];
}

/**
 * Validate a snapshot whose state members carry decoded {@link Op}s.
 *
 * 校验已解码订阅快照。state ops 必须过 assertValidOp。
 */
export function parseServiceSubscriptionSnapshot(value: unknown): ServiceSubscriptionSnapshot {
	assertSubscriptionSnapshot(value, assertValidOp);
	return value as ServiceSubscriptionSnapshot;
}

/**
 * Validate a snapshot whose state members carry {@link WireOp}s.
 *
 * 校验线上订阅快照。state ops 必须过 assertValidWireOp，不能直接 apply。
 */
export function parseWireServiceSubscriptionSnapshot(value: unknown): WireServiceSubscriptionSnapshot {
	assertSubscriptionSnapshot(value, assertValidWireOp);
	return value as WireServiceSubscriptionSnapshot;
}

/**
 * Validate a provider update whose state ops are decoded {@link Op}s.
 *
 * 校验已解码增量。多余字段或非法 verb 都抛。
 */
export function parseServiceProviderUpdate(value: unknown): ServiceProviderUpdate {
	assertProviderUpdate(value, assertValidOp);
	return value as ServiceProviderUpdate;
}

/**
 * Validate a provider update whose state ops are {@link WireOp}s.
 *
 * 校验线上增量。解码前不能当 Op 用。
 */
export function parseWireServiceProviderUpdate(value: unknown): WireServiceProviderUpdate {
	assertProviderUpdate(value, assertValidWireOp);
	return value as WireServiceProviderUpdate;
}

function assertSubscriptionSnapshot(value: unknown, assertOp: (value: unknown) => void): void {
	const snapshot = record(value, "service subscription snapshot");
	assertKeys(snapshot, ["serviceId", "mode", "instances"], [], "service subscription snapshot");
	if (!isId(snapshot.serviceId) || !isMode(snapshot.mode) || !Array.isArray(snapshot.instances)) {
		throw new TypeError("Invalid service subscription snapshot");
	}
	for (const instance of snapshot.instances) assertInstance(instance, assertOp);
}

function assertProviderUpdate(value: unknown, assertOp: (value: unknown) => void): void {
	const update = record(value, "service provider update");
	switch (update.type) {
		case "state":
			assertKeys(update, ["type", "member", "sequence", "ops"], ["instance"], "state update");
			if (!isId(update.member) || !isInteger(update.sequence, 1) || !Array.isArray(update.ops)) {
				throw new TypeError("Invalid service state update");
			}
			if (update.instance !== undefined) assertAddress(update.instance);
			for (const op of update.ops) assertOp(op);
			return;
		case "unavailable":
			assertKeys(update, ["type"], [], "unavailable update");
			return;
		case "replaced":
			assertKeys(update, ["type", "snapshot"], [], "replacement update");
			assertInstance(update.snapshot, assertOp);
			return;
		case "spawned":
			assertKeys(update, ["type", "instance"], [], "spawn update");
			assertInstance(update.instance, assertOp);
			return;
		case "closed":
			assertKeys(update, ["type", "instance"], [], "close update");
			assertAddress(update.instance);
			return;
		default:
			throw new TypeError("Invalid service provider update");
	}
}

function assertInstance(value: unknown, assertOp: (value: unknown) => void): void {
	const instance = record(value, "service instance snapshot");
	assertKeys(instance, ["members"], ["instance"], "service instance snapshot");
	if (instance.instance !== undefined) assertAddress(instance.instance);
	if (!Array.isArray(instance.members)) throw new TypeError("Invalid service instance snapshot");
	for (const candidate of instance.members) {
		const member = record(candidate, "service member snapshot");
		if (member.kind === "method") {
			assertKeys(member, ["name", "kind"], [], "service method snapshot");
			if (!isId(member.name)) throw new TypeError("Invalid service method snapshot");
			continue;
		}
		if (member.kind === "state") {
			assertKeys(member, ["name", "kind", "sequence", "ops"], [], "service state snapshot");
			if (!isId(member.name) || !isInteger(member.sequence, 0) || !Array.isArray(member.ops)) {
				throw new TypeError("Invalid service state snapshot");
			}
			for (const op of member.ops) assertOp(op);
			continue;
		}
		throw new TypeError("Invalid service member snapshot");
	}
}

function assertAddress(value: unknown): asserts value is ServiceInstanceAddress {
	const address = record(value, "service instance address");
	assertKeys(address, ["key", "generation"], [], "service instance address");
	if (!isId(address.key) || !isInteger(address.generation, 1)) {
		throw new TypeError("Invalid service instance address");
	}
}

function record(value: unknown, description: string): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new TypeError(`Invalid ${description}`);
	}
	return value as Record<string, unknown>;
}

function assertKeys(
	value: Record<string, unknown>,
	required: readonly string[],
	optional: readonly string[],
	description: string,
): void {
	const allowed = new Set([...required, ...optional]);
	if (required.some((key) => !Object.hasOwn(value, key)) || Object.keys(value).some((key) => !allowed.has(key))) {
		throw new TypeError(`Invalid ${description}`);
	}
}

function isId(value: unknown): value is string {
	return typeof value === "string" && value.length > 0;
}

function isMode(value: unknown): value is ServiceMode {
	return value === "singleton" || value === "keyed";
}

function isInteger(value: unknown, minimum: number): value is number {
	return typeof value === "number" && Number.isInteger(value) && value >= minimum;
}
