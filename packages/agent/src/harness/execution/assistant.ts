/**
 * Assistant-stream consumption for one already-approved provider request.
 *
 * 消费一条已批准的 assistant 流。不改调用方消息列表；观察者失败会冒泡。
 */

import type {
	Context as AiContext,
	Api,
	AssistantMessage,
	AssistantMessageEvent,
	AssistantMessageEventStream,
	Message,
	Model,
	SimpleStreamOptions,
	Tool,
} from "@earendil-works/pi-ai";
import type { AgentMessage, ThinkingLevel } from "../../types.ts";
import { type Context, getTelemetryContext } from "../context.ts";
import type { SettledAssistantMessage } from "../session/types.ts";
import type { AgentHarnessStreamOptions } from "../types.ts";
import { AbortRequested } from "./effect-gate.ts";

/**
 * HTTP response metadata captured before the provider response body is consumed.
 *
 * 读响应体之前抓到的 HTTP 元数据。afterResponse 能看到，但不保证每个传输都填。
 */
export interface AssistantResponseMetadata {
	status?: number;
	headers?: Record<string, string>;
}

/**
 * Process-local lifecycle observer for one assistant stream.
 *
 * 一条 assistant 流的进程内观察者。start 必须恰好一次，且在 update/done 之前。
 */
export interface AssistantStreamObserver {
	start(
		message: AssistantMessage,
		event: Extract<AssistantMessageEvent, { type: "start" }>,
		context: Context,
	): void | Promise<void>;
	update(message: AssistantMessage, event: AssistantMessageEvent, context: Context): void | Promise<void>;
	end(message: SettledAssistantMessage, context: Context): void | Promise<void>;
}

/**
 * Executable inputs for one already-approved assistant provider request.
 *
 * 已批准请求的可执行输入。本模块不负责审批，只负责发流和收流。
 */
export interface HarnessAssistantStreamConfig {
	model: Model<Api>;
	systemPrompt: string;
	tools?: Tool[];
	thinkingLevel: ThinkingLevel;
	streamOptions: AgentHarnessStreamOptions;
	transformContext?: (
		requestContext: { messages: AgentMessage[]; systemPrompt: string },
		context: Context,
	) => Promise<{ messages: AgentMessage[]; systemPrompt: string }>;
	toProviderMessages: (messages: AgentMessage[], context: Context) => Message[] | Promise<Message[]>;
	beforePayload?: (
		payload: unknown,
		model: Model<Api>,
		context: Context,
	) => unknown | undefined | Promise<unknown | undefined>;
	afterResponse?: (
		message: SettledAssistantMessage,
		metadata: AssistantResponseMetadata,
		context: Context,
	) => Promise<SettledAssistantMessage>;
	request(
		aiContext: AiContext,
		options: SimpleStreamOptions,
		context: Context,
	): AssistantMessageEventStream | Promise<AssistantMessageEventStream>;
	observer: AssistantStreamObserver;
}

function createRequestOptions(
	config: HarnessAssistantStreamConfig,
	captureMetadata: (metadata: AssistantResponseMetadata) => void,
	context: Context,
): SimpleStreamOptions {
	const options = config.streamOptions;
	return {
		transport: options.transport,
		timeoutMs: options.timeoutMs,
		maxRetries: options.maxRetries,
		maxRetryDelayMs: options.maxRetryDelayMs,
		headers: options.headers,
		metadata: options.metadata,
		cacheRetention: options.cacheRetention,
		deferred: options.deferred,
		...(config.thinkingLevel === "off" ? {} : { reasoning: config.thinkingLevel }),
		signal: context.abortSignal,
		telemetryContext: getTelemetryContext(context),
		onPayload:
			config.beforePayload === undefined
				? undefined
				: (payload, model) => config.beforePayload?.(payload, model, context),
		onResponse: (response) => {
			captureMetadata({ status: response.status, headers: response.headers });
		},
	};
}

function isUpdateEvent(
	event: AssistantMessageEvent,
): event is Exclude<AssistantMessageEvent, { type: "start" | "done" | "error" }> {
	return event.type !== "start" && event.type !== "done" && event.type !== "error";
}

/**
 * Drain one assistant event stream and notify the observer of start/update/end.
 *
 * 抽干一条 assistant 流并通知观察者。start 必须恰好一次；afterResponse 里的 AbortRequested 被吞掉。
 */
export async function consumeAssistantStream(
	stream: AssistantMessageEventStream,
	observer: AssistantStreamObserver,
	afterResponse:
		| ((message: SettledAssistantMessage, context: Context) => Promise<SettledAssistantMessage>)
		| undefined,
	context: Context,
): Promise<SettledAssistantMessage> {
	let started = false;
	for await (const event of stream) {
		if (event.type === "start") {
			if (started) throw new Error("Assistant message stream emitted more than one start event");
			started = true;
			await observer.start({ ...event.partial }, event, context);
		} else if (isUpdateEvent(event)) {
			if (!started) throw new Error(`Assistant message stream emitted ${event.type} before start`);
			await observer.update({ ...event.partial }, event, context);
		} else if (event.type === "done" && !started) {
			throw new Error("Assistant message stream emitted done before start");
		}
	}

	const settled = (await stream.result()) as SettledAssistantMessage;
	let finalMessage = settled;
	if (afterResponse !== undefined) {
		try {
			finalMessage = await afterResponse(settled, context);
		} catch (error) {
			if (!(error instanceof AbortRequested)) throw error;
			await error.cancellation;
		}
	}
	await observer.end(finalMessage, context);
	return finalMessage;
}

/**
 * Stream one assistant response without mutating the caller's message list.
 *
 * 发一条 assistant 请求并抽干流。调用方消息列表只被切片拷贝，不被原地改。
 */
export async function streamHarnessAssistant(
	messages: AgentMessage[],
	config: HarnessAssistantStreamConfig,
	context: Context,
): Promise<SettledAssistantMessage> {
	let requestContext = { messages: messages.slice(), systemPrompt: config.systemPrompt };
	if (config.transformContext) {
		requestContext = await config.transformContext(requestContext, context);
	}

	const providerMessages = await config.toProviderMessages(requestContext.messages, context);
	const aiContext: AiContext = {
		systemPrompt: requestContext.systemPrompt,
		messages: providerMessages,
		tools: config.tools,
	};

	let metadata: AssistantResponseMetadata = {};
	const stream = await config.request(
		aiContext,
		createRequestOptions(
			config,
			(nextMetadata) => {
				metadata = nextMetadata;
			},
			context,
		),
		context,
	);

	const afterResponse = config.afterResponse;
	return consumeAssistantStream(
		stream,
		config.observer,
		afterResponse === undefined
			? undefined
			: (message, afterContext) => afterResponse(message, metadata, afterContext),
		context,
	);
}
