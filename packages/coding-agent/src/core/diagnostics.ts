/**
 * Resource-load diagnostics returned to the app layer.
 *
 * 资源加载诊断。碰撞记录胜负路径，由应用层决定是否展示。
 */

/**
 * Two resources of the same type claiming the same name.
 *
 * 同名资源碰撞。winner 是实际生效的那份。
 */
export interface ResourceCollision {
	resourceType: "extension" | "skill" | "prompt" | "theme";
	name: string; // skill name, command/tool/flag name, prompt name, theme name
	winnerPath: string;
	loserPath: string;
	winnerSource?: string; // e.g., "npm:foo", "git:...", "local"
	loserSource?: string;
}

/**
 * One warning, error, or collision from resource loading.
 *
 * 一条资源诊断。collision 只在 type 为 collision 时有意义。
 */
export interface ResourceDiagnostic {
	type: "warning" | "error" | "collision";
	message: string;
	path?: string;
	collision?: ResourceCollision;
}
