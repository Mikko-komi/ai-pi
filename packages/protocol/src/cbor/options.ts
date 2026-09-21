/**
 * Limits, errors, and text codecs for the protocol CBOR subset.
 *
 * CBOR 安全上限和编解码辅助。未受信 payload 必须带默认上限，不能无限递归。
 */

/**
 * 2^32, used to split or reassemble unsigned 64-bit lengths.
 *
 * 2^32。编解码 64 位长度时拆高低 32 位。
 */
export const UINT32_BASE = 0x1_0000_0000;
/**
 * Inclusive upper bound for configured byte and container limits.
 *
 * 配置上限的闭区间顶。maxByteLength / maxContainerLength 不能超过它。
 */
export const MAX_UINT32 = 0xffff_ffff;
const MAX_CONFIGURED_DEPTH = 512;

/**
 * Safe defaults for untrusted protocol payloads.
 *
 * 未受信 payload 的默认字节上限。16 MiB。
 */
export const DEFAULT_MAX_CBOR_BYTE_LENGTH = 16 * 1024 * 1024;
/**
 * Default maximum array elements or map entries.
 *
 * 默认容器长度上限。数组元素或 map 条目。
 */
export const DEFAULT_MAX_CBOR_CONTAINER_LENGTH = 1_000_000;
/**
 * Default maximum recursive CBOR item depth.
 *
 * 默认嵌套深度上限。比配置硬顶 512 更紧。
 */
export const DEFAULT_MAX_CBOR_DEPTH = 64;

/**
 * Optional limits for encode and decode of one CBOR item.
 *
 * 编解码上限。省略则用安全默认；{@link resolveOptions} 会校验范围。
 */
export interface CborOptions {
	/** Maximum encoded input/output bytes and maximum byte/text string length. */
	maxByteLength?: number;
	/** Maximum number of elements in an array or entries in a map. */
	maxContainerLength?: number;
	/** Maximum recursive item depth. */
	maxDepth?: number;
}

/**
 * Fully resolved CBOR limits after range checks.
 *
 * 校验后的上限。三个字段都是具体数字，不再可选。
 */
export interface ResolvedCborOptions {
	maxByteLength: number;
	maxContainerLength: number;
	maxDepth: number;
}

/**
 * Fatal error for unsupported, malformed, or over-limit CBOR.
 *
 * CBOR 致命错误。不支持的类型、畸形或超限都抛它。
 */
export class CborError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CborError";
	}
}

/**
 * Shared UTF-8 encoder for CBOR text strings.
 *
 * 共享 UTF-8 编码器。文本必须能往返成合法 Unicode 标量。
 */
export const textEncoder = new TextEncoder();
/**
 * Shared fatal UTF-8 decoder that rejects invalid text and a leading BOM.
 *
 * 共享 UTF-8 解码器。fatal 且忽略 BOM；非法 UTF-8 抛。
 */
export const textDecoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

function resolveLimit(name: string, value: number, maximum: number): number {
	if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
		throw new RangeError(`${name} must be an integer between 0 and ${maximum}`);
	}
	return value;
}

/**
 * Resolve and range-check CBOR limits, filling in safe defaults.
 *
 * 填默认并校验范围。非法整数或超顶抛 RangeError。
 */
export function resolveOptions(options: CborOptions | undefined): ResolvedCborOptions {
	return {
		maxByteLength: resolveLimit("maxByteLength", options?.maxByteLength ?? DEFAULT_MAX_CBOR_BYTE_LENGTH, MAX_UINT32),
		maxContainerLength: resolveLimit(
			"maxContainerLength",
			options?.maxContainerLength ?? DEFAULT_MAX_CBOR_CONTAINER_LENGTH,
			MAX_UINT32,
		),
		maxDepth: resolveLimit("maxDepth", options?.maxDepth ?? DEFAULT_MAX_CBOR_DEPTH, MAX_CONFIGURED_DEPTH),
	};
}
