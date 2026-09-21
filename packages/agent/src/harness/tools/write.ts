/**
 * Built-in write tool.
 *
 * Creates or overwrites a file and creates missing parent directories.
 *
 * 内置 write 工具。整文件覆盖；同路径突变经队列串行。
 */

import { type Static, Type } from "typebox";
import type { AgentHarnessTool } from "../types.ts";
import { getOrThrow } from "../types.ts";
import { withFileMutationQueue } from "./file-mutation-queue.ts";
import { resolveToolPath } from "./path-utils.ts";
import type { ExecutionToolContext } from "./tool-context.ts";

const writeSchema = Type.Object({
	path: Type.String({ description: "Path to the file to write (relative or absolute)" }),
	content: Type.String({ description: "Content to write to the file" }),
});

/**
 * Parameters accepted by the write tool.
 *
 * write 工具的入参。content 是整文件内容，不是补丁。
 */
export type WriteToolInput = Static<typeof writeSchema>;

/**
 * Create the built-in write tool bound to an ExecutionToolContext.
 *
 * 创建内置 write 工具。整文件覆盖；同路径突变经队列串行。
 */
export function createWriteTool<TContext extends ExecutionToolContext = ExecutionToolContext>(): AgentHarnessTool<
	TContext,
	typeof writeSchema,
	undefined
> {
	return {
		name: "write",
		label: "write",
		description:
			"Write content to a file. Creates the file if it doesn't exist, overwrites if it does. Automatically creates parent directories.",
		parameters: writeSchema,
		async execute(_toolCallId, { path, content }, _onUpdate, { env }, _invocation, context) {
			const absolutePath = await resolveToolPath(env, path, context);
			return withFileMutationQueue(
				env,
				absolutePath,
				async () => {
					if (context.abortSignal?.aborted) throw new Error("Operation aborted");
					getOrThrow(await env.writeFile(absolutePath, content, context));
					if (context.abortSignal?.aborted) throw new Error("Operation aborted");
					return {
						content: [{ type: "text", text: `Successfully wrote to ${path}` }],
						details: undefined,
					};
				},
				context,
			);
		},
	};
}
