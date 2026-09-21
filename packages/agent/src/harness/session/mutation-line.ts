/**
 * Exclusive serialized mutation queue for one Session.
 *
 * 单 Session 的独占写屏障。seal 之后新作业一律拒；已排队作业跑完才释放。
 */

/**
 * Serializes complete read-modify-write jobs for one Session.
 *
 * 串行完整的读改写作业。seal 之后新作业一律拒。
 */
export class MutationLine {
	private tail: Promise<void> = Promise.resolve();
	private sealedError: Error | undefined;

	run<T>(operation: () => T | Promise<T>): Promise<T> {
		if (this.sealedError !== undefined) return Promise.reject(this.sealedError);
		const result = this.tail.then(() => {
			if (this.sealedError !== undefined) throw this.sealedError;
			return operation();
		});
		this.tail = result.then(
			() => undefined,
			() => undefined,
		);
		return result;
	}

	seal(error: Error): Promise<void> {
		this.sealedError ??= error;
		return this.tail;
	}
}
