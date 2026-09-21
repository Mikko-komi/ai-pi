/**
 * Structured diagnostics attached to assistant messages.
 *
 * assistant 消息上的结构化诊断。错误抽成 DiagnosticErrorInfo；追加时拷数组，不原地 push。
 */

/**
 * Serializable snapshot of a thrown value.
 *
 * 可序列化的抛错快照。message 必有。
 */
export interface DiagnosticErrorInfo {
	name?: string;
	message: string;
	stack?: string;
	code?: string | number;
}

/**
 * One diagnostic event recorded on an assistant message.
 *
 * 一条诊断。type 和 timestamp 必有；error / details 可选。
 */
export interface AssistantMessageDiagnostic {
	type: string;
	timestamp: number;
	error?: DiagnosticErrorInfo;
	details?: Record<string, unknown>;
}

/**
 * Turn an unknown thrown value into a display string.
 *
 * Error 用 message 或 name；其余转字符串。不抛。
 */
export function formatThrownValue(value: unknown): string {
	if (value instanceof Error) return value.message || value.name;
	if (typeof value === "string") return value;
	return String(value);
}

/**
 * Normalize an unknown throw into DiagnosticErrorInfo.
 *
 * 非 Error 记为 ThrownValue。code 只收 string / number。
 */
export function extractDiagnosticError(error: unknown): DiagnosticErrorInfo {
	if (!(error instanceof Error)) return { name: "ThrownValue", message: formatThrownValue(error) };
	const code = (error as Error & { code?: unknown }).code;
	return {
		name: error.name || undefined,
		message: error.message || error.name,
		stack: error.stack,
		code: typeof code === "string" || typeof code === "number" ? code : undefined,
	};
}

/**
 * Build one assistant-message diagnostic with the current timestamp.
 *
 * 立刻打 timestamp。error 必抽成 DiagnosticErrorInfo。
 */
export function createAssistantMessageDiagnostic(
	type: string,
	error: unknown,
	details?: Record<string, unknown>,
): AssistantMessageDiagnostic {
	return { type, timestamp: Date.now(), error: extractDiagnosticError(error), details };
}

/**
 * Append one diagnostic to a message without mutating the previous array.
 *
 * 拷一份再追加，不原地改原数组。
 */
export function appendAssistantMessageDiagnostic<T extends { diagnostics?: AssistantMessageDiagnostic[] }>(
	message: T,
	diagnostic: AssistantMessageDiagnostic,
): void {
	message.diagnostics = [...(message.diagnostics ?? []), diagnostic];
}
