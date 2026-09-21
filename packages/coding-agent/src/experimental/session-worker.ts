/**
 * Isolated Session worker process: harness, demand lifecycle, and coordinator control protocol.
 *
 * 独立 Session worker。锁住会话文件后跑 harness；无 demand/操作/hold 才退休。
 */

import { createConnection, type Socket } from "node:net";
import { isAbsolute } from "node:path";
import {
	isJsonValue,
	type JsonValue,
	parseServiceProviderUpdate,
	REMOTE_SERVICE_ERROR_CODES,
	RemoteServiceError,
	type RemoteServiceErrorCode,
	type ServiceCall,
	type ServiceProviderUpdate,
} from "@earendil-works/chord";
import {
	AgentHarness,
	type AgentHarness as AgentHarnessInstance,
	type AgentLane,
	BACKGROUND_CONTEXT,
	createBashTool,
	createReadTool,
	createWriteTool,
	type JsonlSessionMetadata,
	JsonlSessionRepo,
	type Session,
	TODO_CONTEXT,
	withCancel,
} from "@earendil-works/pi-agent-core";
import { NodeExecutionEnv } from "@earendil-works/pi-agent-core/node";
import lockfile from "proper-lockfile";
import Type, { type Static } from "typebox";
import { Check } from "typebox/value";
import { findInitialModel, resolveCliModel } from "../core/model-resolver.ts";
import { ModelRuntime } from "../core/model-runtime.ts";
import { SettingsManager } from "../core/settings-manager.ts";
import { COORDINATOR_PROTOCOL_VERSION } from "./coordinator.ts";
import { createSessionPluginFacetLoader } from "./plugins/bundled.ts";
import {
	consumeInternalProcessRole,
	encodeControlLine,
	isDirectInternalProcessEntry,
	MAX_CONTROL_LINE_BYTES,
} from "./process.ts";
import {
	createSessionWorkerServices,
	type SessionWorkerRuntime,
	type SessionWorkerServices,
	type WorkerServiceScope,
} from "./services/worker.ts";

export type { SessionWorkerRuntime } from "./services/worker.ts";

const StrictObject = <const T extends Parameters<typeof Type.Object>[0]>(properties: T) =>
	Type.Object(properties, { additionalProperties: false });
const OpaqueJsonValueSchema = Type.Unsafe<JsonValue>(Type.Unknown());
const ServiceCallSchema = Type.Unsafe<ServiceCall>(
	StrictObject({
		serviceId: Type.String({ minLength: 1 }),
		instance: Type.Optional(
			StrictObject({ key: Type.String({ minLength: 1 }), generation: Type.Integer({ minimum: 1 }) }),
		),
		member: Type.String({ minLength: 1 }),
		args: Type.Array(Type.Unknown()),
	}),
);
const RemoteServiceErrorCodeSchema = Type.Unsafe<RemoteServiceErrorCode>(
	Type.String({ pattern: `^(?:${REMOTE_SERVICE_ERROR_CODES.join("|")})$` }),
);

/**
 * Environment variable for the coordinator control-socket path.
 *
 * 控制套接字地址环境变量名。缺了不能连 coordinator。
 */
export const SESSION_WORKER_CONTROL_ADDRESS_ENV = "PI_SESSION_WORKER_CONTROL_ADDRESS";

/**
 * Environment variable for the worker's control token.
 *
 * 控制令牌环境变量名。和 ready 事件对账。
 */
export const SESSION_WORKER_CONTROL_TOKEN_ENV = "PI_SESSION_WORKER_CONTROL_TOKEN";

/**
 * Environment variable for the session path encoded as base64url.
 *
 * session path 的 base64url 环境变量名。不是明文路径。
 */
export const SESSION_WORKER_SESSION_KEY_ENV = "PI_SESSION_WORKER_SESSION_KEY_BASE64";

/**
 * Environment variable for the worker's coordinator peer id.
 *
 * coordinator peer id 环境变量名。注册时必须有。
 */
export const SESSION_WORKER_PEER_ID_ENV = "PI_SESSION_WORKER_PEER_ID";

/**
 * Typebox schema for Jsonl session metadata sent into a worker.
 *
 * worker 启动元数据的校验。cwd/path 还要调用方再查绝对路径。
 */
export const SessionWorkerMetadataSchema = StrictObject({
	id: Type.String({ minLength: 1 }),
	createdAt: Type.Integer(),
	storageVersion: Type.Integer(),
	cwd: Type.String(),
	path: Type.String(),
	modifiedAt: Type.Number(),
	parentSessionId: Type.Optional(Type.String()),
});

/**
 * Typebox schema for the worker argv JSON options object.
 *
 * worker argv JSON 的校验。provider 有则必须有 model。
 */
export const SessionWorkerOptionsSchema = StrictObject({
	sessionDir: Type.String({ minLength: 1 }),
	metadata: SessionWorkerMetadataSchema,
	provider: Type.Optional(Type.String({ minLength: 1 })),
	model: Type.Optional(Type.String({ minLength: 1 })),
	pluginManifestPaths: Type.Array(Type.String({ minLength: 1 })),
});

/**
 * Validated options for starting a Session worker.
 *
 * 校验后的 worker 启动选项。
 */
export type SessionWorkerOptions = Static<typeof SessionWorkerOptionsSchema>;

/**
 * Typebox schema for one attached service-invocation scope.
 *
 * 一次服务调用的附着范围校验。
 */
export const WorkerOperationScopeSchema = StrictObject({
	serverConnectionId: Type.String(),
	attachmentId: Type.String(),
});

/**
 * Attachment scope shared with Session worker services.
 *
 * 与 WorkerServiceScope 同形。跨进程对账用。
 */
export type WorkerOperationScope = WorkerServiceScope;

/**
 * Typebox schema for a coordinator-delivered service call.
 *
 * coordinator 下发的一次服务调用。
 */
export const WorkerOperationRequestSchema = StrictObject({
	type: Type.Literal("operation"),
	requestId: Type.String({ minLength: 1 }),
	scope: WorkerOperationScopeSchema,
	call: ServiceCallSchema,
});
/**
 * Validated operation command from the current server generation.
 *
 * 校验后的 operation 命令。
 */
export type WorkerOperationRequest = Static<typeof WorkerOperationRequestSchema>;

/**
 * Typebox schema for a worker operation result or error.
 *
 * worker 回的 result 或 error。
 */
export const WorkerOperationResponseSchema = Type.Union([
	StrictObject({
		type: Type.Literal("operation_result"),
		requestId: Type.String({ minLength: 1 }),
		scope: WorkerOperationScopeSchema,
		result: Type.Optional(OpaqueJsonValueSchema),
	}),
	StrictObject({
		type: Type.Literal("operation_error"),
		requestId: Type.String({ minLength: 1 }),
		scope: WorkerOperationScopeSchema,
		code: Type.Optional(RemoteServiceErrorCodeSchema),
		message: Type.String(),
	}),
]);
/**
 * Validated worker reply for one operation.
 *
 * 校验后的操作回包。
 */
export type WorkerOperationResponse = Static<typeof WorkerOperationResponseSchema>;

/**
 * Typebox schema for server-to-worker control commands.
 *
 * server→worker 控制命令联合。
 */
export const SessionWorkerCommandSchema = Type.Union([
	Type.Object({ type: Type.Literal("shutdown") }),
	Type.Object({ type: Type.Literal("discover_workers") }),
	Type.Object({
		type: Type.Literal("session_demand"),
		serverConnectionId: Type.String(),
		requestId: Type.String(),
		attachmentId: Type.String(),
		attached: Type.Boolean(),
	}),
	WorkerOperationRequestSchema,
	StrictObject({
		type: Type.Literal("operation_cancel"),
		requestId: Type.String({ minLength: 1 }),
		scope: WorkerOperationScopeSchema,
	}),
]);
/**
 * Validated control command received by a worker.
 *
 * 校验后的控制命令。
 */
export type SessionWorkerCommand = Static<typeof SessionWorkerCommandSchema>;

/**
 * Typebox schema for worker-to-server events.
 *
 * worker→server 事件联合。
 */
export const SessionWorkerEventSchema = Type.Union([
	Type.Object({
		type: Type.Literal("worker_ready"),
		token: Type.String(),
		sessionKey: Type.String(),
		sessionId: Type.String(),
		pid: Type.Integer({ minimum: 1 }),
		metadata: SessionWorkerMetadataSchema,
		pluginManifestPaths: Type.Array(Type.String({ minLength: 1 })),
	}),
	Type.Object({
		type: Type.Literal("worker_failed"),
		token: Type.String(),
		sessionKey: Type.String(),
		message: Type.String(),
	}),
	Type.Object({
		type: Type.Literal("demand_applied"),
		token: Type.String(),
		sessionKey: Type.String(),
		requestId: Type.String(),
		attachmentId: Type.String(),
		attached: Type.Boolean(),
	}),
	Type.Object({
		type: Type.Literal("demand_rejected"),
		token: Type.String(),
		sessionKey: Type.String(),
		requestId: Type.String(),
		message: Type.String(),
	}),
	Type.Object({
		type: Type.Literal("operation_response"),
		token: Type.String(),
		sessionKey: Type.String(),
		response: WorkerOperationResponseSchema,
	}),
	Type.Object({
		type: Type.Literal("service_update"),
		token: Type.String(),
		sessionKey: Type.String(),
		scope: WorkerOperationScopeSchema,
		subscriptionId: Type.String({ minLength: 1 }),
		update: Type.Unknown(),
	}),
]);
/**
 * Validated event emitted by a Session worker.
 *
 * 校验后的 worker 事件。
 */
export type SessionWorkerEvent = Static<typeof SessionWorkerEventSchema>;

/**
 * Worker-local reconciliation of server-generation demand and Harness activity.
 *
 * 按 server 代 demand 和 Harness 活动决定何时退休。无 demand/操作/hold 才 retire。
 */
export class WorkerLifecycle {
	readonly #initialDemandGraceMs: number;
	readonly #orphanDemandGraceMs: number;
	readonly #onRetire: () => void;
	readonly #demands = new Map<string, { serverConnectionId: string; attachmentId: string; timer?: NodeJS.Timeout }>();
	readonly #activeOperations = new Set<string>();
	#currentServerConnectionId: string | undefined;
	#initialTimer: NodeJS.Timeout | undefined;
	#demandInitialized: boolean;
	#retirementHolds = 0;
	#retiring = false;

	constructor(options: {
		initialServerConnectionId?: string;
		initialDemandGraceMs: number;
		orphanDemandGraceMs: number;
		onRetire(): void;
	}) {
		this.#currentServerConnectionId = options.initialServerConnectionId;
		this.#initialDemandGraceMs = options.initialDemandGraceMs;
		this.#orphanDemandGraceMs = options.orphanDemandGraceMs;
		this.#onRetire = options.onRetire;
		this.#demandInitialized = false;
		this.#initialTimer = setTimeout(() => {
			this.#initialTimer = undefined;
			this.#demandInitialized = true;
			this.#reconcile();
		}, this.#initialDemandGraceMs);
		this.#initialTimer.unref();
	}

	serverConnected(serverConnectionId: string): void {
		this.#currentServerConnectionId = serverConnectionId;
		for (const demand of this.#demands.values()) {
			if (demand.serverConnectionId !== serverConnectionId || !demand.timer) continue;
			clearTimeout(demand.timer);
			delete demand.timer;
		}
	}

	serverDisconnected(serverConnectionId: string): void {
		if (this.#currentServerConnectionId === serverConnectionId) this.#currentServerConnectionId = undefined;
		for (const [key, demand] of this.#demands) {
			if (demand.serverConnectionId !== serverConnectionId || demand.timer) continue;
			demand.timer = setTimeout(() => {
				if (this.#demands.get(key) !== demand) return;
				this.#demands.delete(key);
				this.#reconcile();
			}, this.#orphanDemandGraceMs);
			demand.timer.unref();
		}
	}

	beginRequest(serverConnectionId: string, attachmentId: string): () => void {
		if (this.#retiring) throw new Error("Session worker is retiring");
		if (serverConnectionId !== this.#currentServerConnectionId) {
			throw new Error("Session worker received a request from a stale server generation");
		}
		const demand = this.#demands.get(demandKey(serverConnectionId, attachmentId));
		if (!demand || demand.timer) {
			throw new Error("Session worker request does not match the active attachment");
		}
		return this.holdRetirement();
	}

	holdRetirement(): () => void {
		this.#retirementHolds += 1;
		let released = false;
		return () => {
			if (released) return;
			released = true;
			this.#retirementHolds -= 1;
			this.#reconcile();
		};
	}

	setDemand(serverConnectionId: string, attachmentId: string, attached: boolean): void {
		if (this.#retiring) throw new Error("Session worker is retiring");
		if (serverConnectionId !== this.#currentServerConnectionId) {
			throw new Error("Session worker received demand from a stale server generation");
		}
		this.#demandInitialized = true;
		if (this.#initialTimer) {
			clearTimeout(this.#initialTimer);
			this.#initialTimer = undefined;
		}
		const key = demandKey(serverConnectionId, attachmentId);
		const previous = this.#demands.get(key);
		if (previous?.timer) clearTimeout(previous.timer);
		if (attached) this.#demands.set(key, { serverConnectionId, attachmentId });
		else this.#demands.delete(key);
		this.#reconcile();
	}

	operationStarted(kind: "run" | "compaction" | "navigation", lane: string, operationId: string): void {
		this.#activeOperations.add(`${kind}\0${lane}\0${operationId}`);
	}

	operationStopped(kind: "run" | "compaction" | "navigation", lane: string, operationId: string): void {
		this.#activeOperations.delete(`${kind}\0${lane}\0${operationId}`);
		this.#reconcile();
	}

	close(): void {
		if (this.#initialTimer) clearTimeout(this.#initialTimer);
		for (const demand of this.#demands.values()) {
			if (demand.timer) clearTimeout(demand.timer);
		}
		this.#demands.clear();
	}

	#reconcile(): void {
		if (
			this.#retiring ||
			!this.#demandInitialized ||
			this.#retirementHolds !== 0 ||
			this.#activeOperations.size !== 0 ||
			this.#demands.size !== 0
		) {
			return;
		}
		this.#retiring = true;
		this.#onRetire();
	}
}

const DEFAULT_INITIAL_DEMAND_GRACE_MS = 10_000;
const DEFAULT_ORPHAN_DEMAND_GRACE_MS = 30_000;
/**
 * Test-only override for the initial demand grace period, in milliseconds.
 *
 * 初始 demand 宽限毫秒。测试用双下划线环境变量。
 */
export const SESSION_WORKER_INITIAL_DEMAND_GRACE_ENV = "__PI_SESSION_WORKER_INITIAL_DEMAND_GRACE_MS";

/**
 * Test-only override for orphan-demand grace after server disconnect, in milliseconds.
 *
 * 孤儿 demand 宽限毫秒。测试用双下划线环境变量。
 */
export const SESSION_WORKER_ORPHAN_DEMAND_GRACE_ENV = "__PI_SESSION_WORKER_ORPHAN_DEMAND_GRACE_MS";

const CoordinatorInputSchema = Type.Union([
	Type.Object({
		type: Type.Literal("peer_registered"),
		peerId: Type.String(),
		serverConnectionId: Type.Optional(Type.String()),
	}),
	Type.Object({ type: Type.Literal("server_connected"), serverConnectionId: Type.String() }),
	Type.Object({ type: Type.Literal("server_disconnected"), serverConnectionId: Type.String() }),
	Type.Object({ type: Type.Literal("message"), from: Type.Literal("server"), payload: Type.Unknown() }),
]);
type CoordinatorInput = Static<typeof CoordinatorInputSchema>;

interface WorkerControl {
	readonly initialServerConnectionId?: string;
	readonly messages: AsyncIterable<unknown>;
	readonly socket: Socket;
	send(event: SessionWorkerEvent): Promise<void>;
}

let failureControl: WorkerControl | undefined;

async function connectControl(): Promise<WorkerControl> {
	const address = process.env[SESSION_WORKER_CONTROL_ADDRESS_ENV];
	const token = process.env[SESSION_WORKER_CONTROL_TOKEN_ENV];
	const encodedSessionKey = process.env[SESSION_WORKER_SESSION_KEY_ENV];
	if (!address || !token || !encodedSessionKey) throw new Error("Session worker requires a control address");
	const peerId = process.env[SESSION_WORKER_PEER_ID_ENV];
	if (!peerId) throw new Error("Session worker requires a peer ID");
	const socket = createConnection(address);
	await new Promise<void>((resolve, reject) => {
		socket.once("connect", resolve);
		socket.once("error", reject);
	});
	const messages = createJsonLineMessages(socket);
	await writeJsonLine(socket, { type: "register_peer", protocol: COORDINATOR_PROTOCOL_VERSION, peerId });
	const registered = await messages[Symbol.asyncIterator]().next();
	if (
		registered.done ||
		!Check(CoordinatorInputSchema, registered.value) ||
		registered.value.type !== "peer_registered"
	) {
		throw new Error("Coordinator rejected the session worker registration");
	}
	return {
		...(registered.value.serverConnectionId === undefined
			? {}
			: { initialServerConnectionId: registered.value.serverConnectionId }),
		messages,
		socket,
		send: (event) => writeJsonLine(socket, { type: "send", to: "server", payload: event }),
	};
}

async function readCommands(
	control: WorkerControl,
	handlers: {
		onShutdown(): void;
		onDiscovery(): void;
		onDemand(command: Extract<SessionWorkerCommand, { type: "session_demand" }>): Promise<void>;
		onOperation(command: WorkerOperationRequest): void;
		onOperationCancel(command: Extract<SessionWorkerCommand, { type: "operation_cancel" }>): void;
		onServerConnected(serverConnectionId: string): void;
		onServerDisconnected(serverConnectionId: string): void;
	},
): Promise<void> {
	for await (const value of control.messages) {
		if (!Check(CoordinatorInputSchema, value)) {
			control.socket.destroy(new Error("Coordinator sent an invalid worker message"));
			return;
		}
		const message: CoordinatorInput = value;
		if (message.type === "server_connected") {
			handlers.onServerConnected(message.serverConnectionId);
			continue;
		}
		if (message.type === "server_disconnected") {
			handlers.onServerDisconnected(message.serverConnectionId);
			continue;
		}
		if (message.type !== "message" || !Check(SessionWorkerCommandSchema, message.payload)) continue;
		const command: SessionWorkerCommand = message.payload;
		if (command.type === "shutdown") handlers.onShutdown();
		else if (command.type === "discover_workers") handlers.onDiscovery();
		else if (command.type === "session_demand") await handlers.onDemand(command);
		else if (command.type === "operation_cancel") handlers.onOperationCancel(command);
		else handlers.onOperation(command);
	}
}

function createJsonLineMessages(socket: Socket): AsyncIterable<unknown> {
	const queued: unknown[] = [];
	const waiters: ((value: unknown) => void)[] = [];
	let buffered = "";
	socket.setEncoding("utf8");
	socket.on("data", (chunk: string) => {
		buffered += chunk;
		if (Buffer.byteLength(buffered) > MAX_CONTROL_LINE_BYTES) {
			socket.destroy(new Error("Session worker control message is too large"));
			return;
		}
		while (true) {
			const newline = buffered.indexOf("\n");
			if (newline === -1) return;
			const line = buffered.slice(0, newline);
			buffered = buffered.slice(newline + 1);
			try {
				const value: unknown = JSON.parse(line);
				const waiter = waiters.shift();
				if (waiter) waiter(value);
				else queued.push(value);
			} catch {
				socket.destroy(new Error("Session worker received invalid control JSON"));
				return;
			}
		}
	});
	return {
		[Symbol.asyncIterator]() {
			return {
				next: async () => {
					const value = queued.shift() ?? (await new Promise<unknown>((resolve) => waiters.push(resolve)));
					return { done: false as const, value };
				},
			};
		},
	};
}

function writeJsonLine(socket: Socket, message: unknown): Promise<void> {
	return new Promise((resolve, reject) => {
		socket.write(encodeControlLine(message), (error) => {
			if (error) reject(error);
			else resolve();
		});
	});
}

function toWorkerServiceUpdate(update: ServiceProviderUpdate): ServiceProviderUpdate {
	if (!isJsonValue(update)) throw new Error("Service produced a non-JSON update");
	return parseServiceProviderUpdate(update);
}

function demandKey(serverConnectionId: string, attachmentId: string): string {
	return `${serverConnectionId}\0${attachmentId}`;
}

function sameScope(left: WorkerOperationScope, right: WorkerOperationScope): boolean {
	return left.serverConnectionId === right.serverConnectionId && left.attachmentId === right.attachmentId;
}

function lifecycleDelay(name: string, fallback: number): number {
	const value = process.env[name];
	if (value === undefined) return fallback;
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative safe integer`);
	return parsed;
}

async function closeResources(resources: {
	harness?: AgentHarnessInstance;
	services?: SessionWorkerServices;
	session?: Session<JsonlSessionMetadata>;
	repo: JsonlSessionRepo;
	executionEnv: NodeExecutionEnv;
	releaseOwnership: () => Promise<void>;
}): Promise<void> {
	const errors: unknown[] = [];
	try {
		await resources.services?.dispose();
	} catch (error) {
		errors.push(error);
	}
	try {
		if (resources.harness) await resources.harness.close(TODO_CONTEXT);
		else await resources.session?.close(TODO_CONTEXT);
	} catch (error) {
		errors.push(error);
	}
	try {
		await resources.repo.close(TODO_CONTEXT);
	} catch (error) {
		errors.push(error);
	}
	try {
		await resources.executionEnv.cleanup(TODO_CONTEXT);
	} catch (error) {
		errors.push(error);
	}
	try {
		await resources.releaseOwnership();
	} catch (error) {
		errors.push(error);
	}
	if (errors.length === 1) throw errors[0];
	if (errors.length > 1) throw new AggregateError(errors, "Session worker cleanup failed");
}

/**
 * Factory that builds the harness runtime for one Session worker.
 *
 * 注入 harness 工厂。测试可换，生产走 coding-agent。
 */
export type CreateSessionWorkerHarness = (
	session: Session<JsonlSessionMetadata>,
	options: SessionWorkerOptions,
	executionEnv: NodeExecutionEnv,
) => Promise<SessionWorkerRuntime>;

async function run(options: SessionWorkerOptions, createHarness: CreateSessionWorkerHarness): Promise<void> {
	const { sessionDir, metadata } = options;
	const sessionId = metadata.id;
	const control = await connectControl();
	const token = process.env[SESSION_WORKER_CONTROL_TOKEN_ENV]!;
	const sessionKey = Buffer.from(process.env[SESSION_WORKER_SESSION_KEY_ENV]!, "base64url").toString();
	failureControl = control;
	const pluginManifestPaths = options.pluginManifestPaths;
	const releaseOwnership = await lockfile.lock(metadata.path, {
		realpath: true,
		stale: 2_000,
		update: 1_000,
		retries: { retries: 320, factor: 1, minTimeout: 25, maxTimeout: 25, maxRetryTime: 8_000 },
	});
	const executionEnv = new NodeExecutionEnv({ cwd: metadata.cwd });
	const repo = new JsonlSessionRepo({ fileSystem: executionEnv, sessionsRoot: sessionDir });
	let session: Session<JsonlSessionMetadata> | undefined;
	let harness: AgentHarnessInstance | undefined;
	let lane: AgentLane | undefined;
	let services: SessionWorkerServices | undefined;
	try {
		session = await repo.open(metadata, TODO_CONTEXT);
		const runtime = await createHarness(session, options, executionEnv);
		harness = runtime.harness;
		lane = runtime.lane ?? (await harness.lane("main", TODO_CONTEXT));
		services = await createSessionWorkerServices({
			lane,
			modelRuntime: runtime.modelRuntime,
			settingsManager: runtime.settingsManager,
			facetLoader: runtime.facetLoader,
			publish: (scope, subscriptionId, update) =>
				control.send({
					type: "service_update",
					token,
					sessionKey,
					scope,
					subscriptionId,
					update: toWorkerServiceUpdate(update),
				}),
		});
	} catch (error) {
		try {
			await closeResources({ harness, services, session, repo, executionEnv, releaseOwnership });
		} catch (cleanupError) {
			throw new AggregateError([error, cleanupError], "Session worker startup and cleanup failed");
		}
		throw error;
	}

	const activeRequests = new Map<
		string,
		{ readonly scope: WorkerOperationScope; readonly cancel: (reason?: unknown) => void }
	>();
	let lifecycle: WorkerLifecycle | undefined;
	let removeLifecycleListeners: (() => void)[] = [];
	let closing: Promise<void> | undefined;
	const close = (): Promise<void> => {
		if (closing) return closing;
		lifecycle?.close();
		services.removeSubscriptions(() => true);
		for (const request of activeRequests.values()) request.cancel(new Error("Session worker is closing"));
		activeRequests.clear();
		for (const remove of removeLifecycleListeners) remove();
		removeLifecycleListeners = [];
		closing = closeResources({ harness, services, repo, executionEnv, releaseOwnership });
		return closing;
	};
	const closeAndExit = (): void => {
		void close().then(
			() => process.exit(0),
			(error: unknown) => {
				console.error(error);
				process.exit(1);
			},
		);
	};

	lifecycle = new WorkerLifecycle({
		initialServerConnectionId: control.initialServerConnectionId,
		initialDemandGraceMs: lifecycleDelay(SESSION_WORKER_INITIAL_DEMAND_GRACE_ENV, DEFAULT_INITIAL_DEMAND_GRACE_MS),
		orphanDemandGraceMs: lifecycleDelay(SESSION_WORKER_ORPHAN_DEMAND_GRACE_ENV, DEFAULT_ORPHAN_DEMAND_GRACE_MS),
		onRetire: closeAndExit,
	});
	removeLifecycleListeners = [
		harness.events.on("run_start", (event) => lifecycle?.operationStarted("run", event.lane, event.runId)),
		harness.events.on("run_resume", (event) => lifecycle?.operationStarted("run", event.lane, event.runId)),
		harness.events.on("run_suspend", (event) => lifecycle?.operationStopped("run", event.lane, event.runId)),
		harness.events.on("run_end", (event) => lifecycle?.operationStopped("run", event.lane, event.runId)),
		harness.events.on("compaction_start", (event) =>
			lifecycle?.operationStarted("compaction", event.lane, event.runId),
		),
		harness.events.on("compaction_end", (event) =>
			lifecycle?.operationStopped("compaction", event.lane, event.runId),
		),
		harness.events.on("navigation_start", (event) =>
			lifecycle?.operationStarted("navigation", event.lane, event.runId),
		),
		harness.events.on("navigation_end", (event) =>
			lifecycle?.operationStopped("navigation", event.lane, event.runId),
		),
		harness.events.on("fault", closeAndExit),
	];

	const handleOperation = async (request: WorkerOperationRequest): Promise<void> => {
		let releaseRequest = (): void => {};
		const cancellable = withCancel(BACKGROUND_CONTEXT);
		try {
			releaseRequest = lifecycle!.beginRequest(request.scope.serverConnectionId, request.scope.attachmentId);
			activeRequests.set(request.requestId, { scope: request.scope, cancel: cancellable.cancel });
			const result = await services.invoke(request.call, request.scope, cancellable.context);
			if (result !== undefined && !isJsonValue(result)) throw new Error("Service produced a non-JSON result");
			await control.send({
				type: "operation_response",
				token,
				sessionKey,
				response: {
					type: "operation_result",
					requestId: request.requestId,
					scope: request.scope,
					...(result === undefined ? {} : { result }),
				},
			});
		} catch (error) {
			let code: RemoteServiceErrorCode | undefined;
			if (error instanceof RemoteServiceError) {
				code = error.code;
			} else if (error instanceof Error && "code" in error) {
				const candidate = error.code;
				if (Check(RemoteServiceErrorCodeSchema, candidate)) code = candidate;
			}
			await control.send({
				type: "operation_response",
				token,
				sessionKey,
				response: {
					type: "operation_error",
					requestId: request.requestId,
					scope: request.scope,
					...(code === undefined ? {} : { code }),
					message: error instanceof Error ? error.message : String(error),
				},
			});
		} finally {
			if (activeRequests.get(request.requestId)?.cancel === cancellable.cancel) {
				activeRequests.delete(request.requestId);
			}
			releaseRequest();
		}
	};

	let ready = false;
	const announce = (): void => {
		if (!ready) return;
		void control
			.send({
				type: "worker_ready",
				token,
				sessionKey,
				sessionId,
				pid: process.pid,
				metadata,
				pluginManifestPaths: [...pluginManifestPaths],
			})
			.catch(() => closeAndExit());
	};
	void readCommands(control, {
		onShutdown: closeAndExit,
		onDiscovery: announce,
		onDemand: async (command) => {
			const releaseRetirement = lifecycle?.holdRetirement() ?? (() => {});
			try {
				try {
					if (!command.attached) {
						const matches = (scope: WorkerOperationScope): boolean =>
							scope.serverConnectionId === command.serverConnectionId &&
							scope.attachmentId === command.attachmentId;
						services.removeSubscriptions(matches);
					}
					lifecycle?.setDemand(command.serverConnectionId, command.attachmentId, command.attached);
				} catch (error) {
					await control.send({
						type: "demand_rejected",
						token,
						sessionKey,
						requestId: command.requestId,
						message: error instanceof Error ? error.message : String(error),
					});
					return;
				}
				await control.send({
					type: "demand_applied",
					token,
					sessionKey,
					requestId: command.requestId,
					attachmentId: command.attachmentId,
					attached: command.attached,
				});
			} finally {
				releaseRetirement();
			}
		},
		onOperation: (request) => {
			void handleOperation(request).catch(() => closeAndExit());
		},
		onOperationCancel: (command) => {
			const active = activeRequests.get(command.requestId);
			if (active !== undefined && sameScope(active.scope, command.scope)) {
				active.cancel(new DOMException("Service operation cancelled", "AbortError"));
			}
		},
		onServerConnected: (serverConnectionId) => lifecycle?.serverConnected(serverConnectionId),
		onServerDisconnected: (serverConnectionId) => {
			const matches = (scope: WorkerOperationScope): boolean => scope.serverConnectionId === serverConnectionId;
			services.removeSubscriptions(matches);
			for (const request of activeRequests.values()) {
				if (matches(request.scope)) request.cancel(new Error("Server disconnected"));
			}
			lifecycle?.serverDisconnected(serverConnectionId);
		},
	}).catch(() => closeAndExit());
	control.socket.once("close", closeAndExit);
	control.socket.once("error", () => closeAndExit());
	process.once("SIGTERM", closeAndExit);
	process.once("SIGINT", closeAndExit);

	try {
		ready = true;
		await control.send({
			type: "worker_ready",
			token,
			sessionKey,
			sessionId,
			pid: process.pid,
			metadata,
			pluginManifestPaths: [...pluginManifestPaths],
		});
	} catch (error) {
		try {
			await close();
		} catch (cleanupError) {
			throw new AggregateError([error, cleanupError], "Session worker readiness and cleanup failed");
		}
		throw error;
	}
}

/**
 * Run a Session worker with an injected harness factory.
 *
 * 用给定工厂跑 worker。选项非法或失败会发 worker_failed。
 */
export async function runSessionWorkerWithHarness(
	args: readonly string[],
	createHarness: CreateSessionWorkerHarness,
): Promise<void> {
	try {
		if (args.length !== 1) throw new Error("Session worker requires one options argument");
		let options: unknown;
		try {
			options = JSON.parse(args[0]!);
		} catch (error) {
			throw new Error("Session worker received invalid options", { cause: error });
		}
		if (
			!Check(SessionWorkerOptionsSchema, options) ||
			!isAbsolute(options.sessionDir) ||
			!isAbsolute(options.metadata.cwd) ||
			!isAbsolute(options.metadata.path) ||
			(options.provider !== undefined && options.model === undefined)
		) {
			throw new Error("Session worker received invalid options");
		}
		await run(options, createHarness);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const token = process.env[SESSION_WORKER_CONTROL_TOKEN_ENV];
		const encodedSessionKey = process.env[SESSION_WORKER_SESSION_KEY_ENV];
		if (token && encodedSessionKey) {
			const sessionKey = Buffer.from(encodedSessionKey, "base64url").toString();
			await failureControl?.send({ type: "worker_failed", token, sessionKey, message }).catch(() => {});
		}
		throw error;
	}
}

async function createCodingAgentHarness(
	session: Session<JsonlSessionMetadata>,
	options: SessionWorkerOptions,
	executionEnv: NodeExecutionEnv,
): Promise<SessionWorkerRuntime> {
	const modelRuntime = await ModelRuntime.create();
	const settingsManager = SettingsManager.create(session.metadata.cwd);
	let resolved: Awaited<ReturnType<typeof findInitialModel>> | ReturnType<typeof resolveCliModel>;
	if (options.model === undefined) {
		resolved = await findInitialModel({
			scopedModels: [],
			isContinuing: true,
			defaultProvider: settingsManager.getDefaultProvider(),
			defaultModelId: settingsManager.getDefaultModel(),
			defaultThinkingLevel: settingsManager.getDefaultThinkingLevel(),
			modelRuntime,
		});
	} else {
		resolved = resolveCliModel({
			cliProvider: options.provider,
			cliModel: options.model,
			modelRuntime,
		});
		if (resolved.error) throw new Error(`Session worker could not resolve model: ${resolved.error}`);
	}
	if (!resolved.model) throw new Error("Session worker could not resolve a model");
	const tools = [createReadTool(), createWriteTool(), createBashTool()];
	const activeToolNames = tools.map((tool) => tool.name);
	const harness = (
		await AgentHarness.create(
			{
				session,
				models: modelRuntime,
				model: resolved.model,
				thinkingLevel: resolved.thinkingLevel,
				tools,
				activeToolNames,
				toolContext: { env: executionEnv },
				resources: {},
			},
			TODO_CONTEXT,
		)
	).harness;
	try {
		const lane = await harness.lane("main", TODO_CONTEXT);
		const currentActiveToolNames = await lane.getActiveTools(TODO_CONTEXT);
		if (
			currentActiveToolNames.length !== activeToolNames.length ||
			currentActiveToolNames.some((name, index) => name !== activeToolNames[index])
		) {
			await lane.setActiveTools(activeToolNames, TODO_CONTEXT);
		}
		return {
			harness,
			lane,
			modelRuntime,
			settingsManager,
			facetLoader: createSessionPluginFacetLoader(options.pluginManifestPaths),
		};
	} catch (error) {
		try {
			await harness.close(TODO_CONTEXT);
		} catch (cleanupError) {
			throw new AggregateError([error, cleanupError], "Session worker model selection and cleanup failed");
		}
		throw error;
	}
}

/**
 * Production Session worker entry that uses the coding-agent harness.
 *
 * 生产入口。固定 coding-agent harness。
 */
export function runSessionWorkerProcess(args: readonly string[]): Promise<void> {
	return runSessionWorkerWithHarness(args, createCodingAgentHarness);
}

if (isDirectInternalProcessEntry(import.meta.url)) {
	const role = consumeInternalProcessRole();
	if (role !== "session-worker") {
		throw new Error("Session worker entrypoint requires an internal session-worker invocation");
	}
	void runSessionWorkerProcess(process.argv.slice(2)).catch(() => process.exit(1));
}
