/**
 * Convert image bytes or base64 payloads to PNG via Photon.
 *
 * Photon 不可用或解码失败返回 null。会先按 EXIF 方向摆正再编码。
 */

import { applyExifOrientation } from "./exif-orientation.ts";
import { loadPhoton } from "./photon.ts";

/**
 * Convert raw image bytes to PNG.
 *
 * Photon 没装或转换失败返回 null。旋转后的临时图会 free。
 */
export async function convertImageBytesToPng(bytes: Uint8Array): Promise<Uint8Array | null> {
	const photon = await loadPhoton();
	if (!photon) {
		// Photon not available, can't convert
		return null;
	}

	try {
		const rawImage = photon.PhotonImage.new_from_byteslice(bytes);
		const image = applyExifOrientation(photon, rawImage, bytes);
		if (image !== rawImage) rawImage.free();
		try {
			return new Uint8Array(image.get_bytes());
		} finally {
			image.free();
		}
	} catch {
		// Conversion failed
		return null;
	}
}

/**
 * Convert image to PNG format for terminal display.
 * Kitty graphics protocol requires PNG format (f=100).
 *
 * 已是 PNG 原样返回。转失败返回 null，不抛。
 */
export async function convertToPng(
	base64Data: string,
	mimeType: string,
): Promise<{ data: string; mimeType: string } | null> {
	// Already PNG, no conversion needed
	if (mimeType === "image/png") {
		return { data: base64Data, mimeType };
	}

	const bytes = new Uint8Array(Buffer.from(base64Data, "base64"));
	const pngBytes = await convertImageBytesToPng(bytes);
	if (!pngBytes) {
		return null;
	}

	return {
		data: Buffer.from(pngBytes).toString("base64"),
		mimeType: "image/png",
	};
}
