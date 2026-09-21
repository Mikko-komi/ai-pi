/**
 * Strict RFC 8949 subset used by the Chord protocol wire format.
 *
 * 协议用的严格 CBOR 子集。再导出编解码和安全默认上限，本文件不定义符号。
 */

export { decodeCbor } from "./decoder.ts";
export { encodeCbor } from "./encoder.ts";
export {
	CborError,
	type CborOptions,
	DEFAULT_MAX_CBOR_BYTE_LENGTH,
	DEFAULT_MAX_CBOR_CONTAINER_LENGTH,
	DEFAULT_MAX_CBOR_DEPTH,
} from "./options.ts";
