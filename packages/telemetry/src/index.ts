/**
 * Callback telemetry contracts, schema vocabulary, and typed span starters.
 *
 * 回调式遥测合同、schema 词汇和按 schema 收窄的 span 启动器。schema 只服务类型推断，运行时不校验。
 */

/**
 * Primitive or homogeneous primitive-array attribute value.
 *
 * 属性值。只允许标量或同质只读数组；undefined 不进这个联合。
 */
export type AttributeValue = string | number | boolean | readonly string[] | readonly number[] | readonly boolean[];

/**
 * Named attribute bag for span start, events, and later merges.
 *
 * span 属性袋。缺省或 undefined 值不当作已记录。
 */
export interface SpanAttributes {
	[name: string]: AttributeValue | undefined;
}

/**
 * Start options for one telemetry span.
 *
 * 开 span 的选项。name 必有；attributes 可选。
 */
export interface SpanOptions {
	name: string;
	attributes?: SpanAttributes;
}

/**
 * Terminal span status: success or an optional error snapshot.
 *
 * span 终态。error 可选；没给 details 仍是 error。
 */
export type SpanStatus = { status: "ok" } | { status: "error"; error?: { name: string; message: string } };

/**
 * Callback-owned telemetry parent: start a span and run work inside it.
 *
 * 回调式父上下文。span 生命周期跟 callback 走，不是手动 start/end。
 */
export interface TelemetryContext {
	startSpan<T>(options: SpanOptions, callback: (span: TelemetrySpan) => T | Promise<T>): Promise<T>;
}

/**
 * Live span handle: nested starts plus events, attributes, and status.
 *
 * 进行中的 span。可再开子 span；结算后的写操作实现应忽略。
 */
export interface TelemetrySpan extends TelemetryContext {
	addEvent(name: string, attributes?: SpanAttributes): void;
	setAttributes(attributes: SpanAttributes): void;
	setStatus(status: SpanStatus): void;
}

export { NOOP_TELEMETRY_CONTEXT } from "./noop.ts";

/**
 * Closed set of attribute types a schema may declare.
 *
 * schema 属性类型闭集。和运行时 {@link AttributeValue} 对齐。
 */
export type TelemetryAttributeType = "string" | "number" | "boolean" | "string[]" | "number[]" | "boolean[]";

/**
 * Human-facing metadata for one schema attribute.
 *
 * 属性的说明元数据。不管类型和取值约束。
 */
export interface TelemetryAttributeMetadata {
	description: string;
	sensitive?: boolean;
	cardinality?: "low" | "high";
}

/**
 * Typed schema attribute: metadata plus a closed type and optional enums.
 *
 * 带类型的属性定义。values/elementValues 收窄取值；examples 只说明。
 */
export type TelemetryAttributeDefinition = TelemetryAttributeMetadata &
	(
		| { type: "string"; values?: readonly string[]; examples?: readonly string[] }
		| { type: "number"; values?: readonly number[]; examples?: readonly number[] }
		| { type: "boolean"; values?: readonly boolean[]; examples?: readonly boolean[] }
		| { type: "string[]"; elementValues?: readonly string[]; examples?: readonly (readonly string[])[] }
		| { type: "number[]"; elementValues?: readonly number[]; examples?: readonly (readonly number[])[] }
		| { type: "boolean[]"; elementValues?: readonly boolean[]; examples?: readonly (readonly boolean[])[] }
	);

/**
 * Start-time attribute definition with a required flag.
 *
 * 开 span 时的属性。required 决定 {@link InferStartAttributes} 是否必填。
 */
export type TelemetryStartAttributeDefinition = TelemetryAttributeDefinition & { required: boolean };

/**
 * Event attribute definition with a required flag.
 *
 * 事件属性。required 决定 {@link InferEventAttributes} 是否必填。
 */
export type TelemetryEventAttributeDefinition = TelemetryAttributeDefinition & { required: boolean };

/**
 * Named event a span may emit, with its attribute vocabulary.
 *
 * span 可发的命名事件。attributes 是该事件的词汇。
 */
export interface TelemetryEventDefinition {
	description: string;
	attributes: Record<string, TelemetryEventAttributeDefinition>;
}

/**
 * Allowed parent kinds for a schema span.
 *
 * 允许的父 span。any / 根或外部 / 指名 spans。
 */
export type TelemetryParentDefinition =
	| { kind: "any" }
	| { kind: "root_or_external" }
	| { kind: "spans"; spans: readonly string[] };

/**
 * One named span in a telemetry schema.
 *
 * schema 里的一条 span。含父母约束、起止属性、事件和默认状态。
 */
export interface TelemetrySpanDefinition {
	description: string;
	parents: TelemetryParentDefinition;
	startAttributes: Record<string, TelemetryStartAttributeDefinition>;
	endAttributes: Record<string, TelemetryAttributeDefinition>;
	events?: Record<string, TelemetryEventDefinition>;
	status: { default: "ok"; errorWhen: string };
}

/**
 * Versioned map of named span definitions.
 *
 * 版本化的 span 词汇。{@link defineTelemetrySchema} 原样返回，不改内容。
 */
export interface TelemetrySchemaDefinition {
	version: number;
	spans: Record<string, TelemetrySpanDefinition>;
}

/**
 * Typed identity helper for serializable telemetry schema data.
 *
 * 给 schema 字面量钉类型。运行时原样返回，不做校验。
 */
export function defineTelemetrySchema<const T extends TelemetrySchemaDefinition>(schema: T): T {
	return schema;
}

type AttributeDefinitionValue<Definition extends TelemetryAttributeDefinition> = Definition extends {
	type: "string";
	values: readonly (infer Value extends string)[];
}
	? Value
	: Definition extends { type: "string" }
		? string
		: Definition extends { type: "number"; values: readonly (infer Value extends number)[] }
			? Value
			: Definition extends { type: "number" }
				? number
				: Definition extends { type: "boolean"; values: readonly (infer Value extends boolean)[] }
					? Value
					: Definition extends { type: "boolean" }
						? boolean
						: Definition extends {
									type: "string[]";
									elementValues: readonly (infer Value extends string)[];
								}
							? readonly Value[]
							: Definition extends { type: "string[]" }
								? readonly string[]
								: Definition extends {
											type: "number[]";
											elementValues: readonly (infer Value extends number)[];
										}
									? readonly Value[]
									: Definition extends { type: "number[]" }
										? readonly number[]
										: Definition extends {
													type: "boolean[]";
													elementValues: readonly (infer Value extends boolean)[];
												}
											? readonly Value[]
											: readonly boolean[];

type RequiredAttributeNames<
	Definitions extends Record<string, TelemetryStartAttributeDefinition | TelemetryEventAttributeDefinition>,
> = {
	[Name in keyof Definitions]-?: Definitions[Name]["required"] extends true ? Name : never;
}[keyof Definitions];

type OptionalAttributeNames<
	Definitions extends Record<string, TelemetryStartAttributeDefinition | TelemetryEventAttributeDefinition>,
> = Exclude<keyof Definitions, RequiredAttributeNames<Definitions>>;

/**
 * Object type with required and optional keys from attribute definitions.
 *
 * 按 required 拆必填/可选。空定义收成 `Record<string, never>`。
 */
export type InferRequiredAndOptionalAttributes<
	Definitions extends Record<string, TelemetryStartAttributeDefinition | TelemetryEventAttributeDefinition>,
> = keyof Definitions extends never
	? Record<string, never>
	: {
			[Name in RequiredAttributeNames<Definitions>]: AttributeDefinitionValue<Definitions[Name]>;
		} & {
			[Name in OptionalAttributeNames<Definitions>]?: AttributeDefinitionValue<Definitions[Name]>;
		};

/**
 * Inferred start-attribute object for one span definition map.
 *
 * 开 span 时的属性对象。委托 {@link InferRequiredAndOptionalAttributes}。
 */
export type InferStartAttributes<Definitions extends Record<string, TelemetryStartAttributeDefinition>> =
	InferRequiredAndOptionalAttributes<Definitions>;

/**
 * Inferred end-attribute object: every key optional.
 *
 * 结束属性。全部可选；空定义同样是 `Record<string, never>`。
 */
export type InferOptionalAttributes<Definitions extends Record<string, TelemetryAttributeDefinition>> =
	keyof Definitions extends never
		? Record<string, never>
		: { [Name in keyof Definitions]?: AttributeDefinitionValue<Definitions[Name]> };

/**
 * Actual attributes that may not introduce keys beyond Expected.
 *
 * 禁止多余键。Actual 必须是 Expected 的精确子集。
 */
export type ExactTelemetryAttributes<Expected, Actual extends Expected> = Actual &
	Record<Exclude<keyof Actual, keyof Expected>, never>;

/**
 * Inferred event-attribute object for one event definition map.
 *
 * 事件属性对象。和 start 一样按 required 拆。
 */
export type InferEventAttributes<Definitions extends Record<string, TelemetryEventAttributeDefinition>> =
	InferRequiredAndOptionalAttributes<Definitions>;

/**
 * String span names declared on one schema.
 *
 * 某 schema 里的 span 名。从 spans 的 key 抽出 string。
 */
export type TelemetrySchemaSpanName<Schema extends TelemetrySchemaDefinition> = keyof Schema["spans"] & string;

type SchemaSpan<
	Schema extends TelemetrySchemaDefinition,
	Name extends TelemetrySchemaSpanName<Schema>,
> = Schema["spans"][Name];

/**
 * Inferred start attributes for a named span on a schema.
 *
 * 指名 span 的开场属性。定义对不上则 never。
 */
export type TelemetrySchemaSpanStartAttributes<
	Schema extends TelemetrySchemaDefinition,
	Name extends TelemetrySchemaSpanName<Schema>,
> = SchemaSpan<Schema, Name>["startAttributes"] extends infer Definitions extends Record<
	string,
	TelemetryStartAttributeDefinition
>
	? InferStartAttributes<Definitions>
	: never;

/**
 * Inferred end attributes for a named span on a schema.
 *
 * 指名 span 的结束属性。定义对不上则 never。
 */
export type TelemetrySchemaSpanEndAttributes<
	Schema extends TelemetrySchemaDefinition,
	Name extends TelemetrySchemaSpanName<Schema>,
> = SchemaSpan<Schema, Name>["endAttributes"] extends infer Definitions extends Record<
	string,
	TelemetryAttributeDefinition
>
	? InferOptionalAttributes<Definitions>
	: never;

type SchemaSpanEvents<
	Schema extends TelemetrySchemaDefinition,
	Name extends TelemetrySchemaSpanName<Schema>,
> = SchemaSpan<Schema, Name> extends { events: infer Events extends Record<string, TelemetryEventDefinition> }
	? Events
	: Record<never, never>;

/**
 * Event names declared on one named span.
 *
 * 指名 span 上的事件名。没 events 则空。
 */
export type TelemetrySchemaSpanEventName<
	Schema extends TelemetrySchemaDefinition,
	Name extends TelemetrySchemaSpanName<Schema>,
> = keyof SchemaSpanEvents<Schema, Name> & string;

type SchemaSpanEvent<
	Schema extends TelemetrySchemaDefinition,
	Name extends TelemetrySchemaSpanName<Schema>,
	EventName extends TelemetrySchemaSpanEventName<Schema, Name>,
> = SchemaSpanEvents<Schema, Name> extends infer Events
	? EventName extends keyof Events
		? Events[EventName]
		: never
	: never;

/**
 * Inferred attributes for one named event on a named span.
 *
 * 某 span 某事件的属性。定义对不上则 never。
 */
export type TelemetrySchemaSpanEventAttributes<
	Schema extends TelemetrySchemaDefinition,
	Name extends TelemetrySchemaSpanName<Schema>,
	EventName extends TelemetrySchemaSpanEventName<Schema, Name>,
> = SchemaSpanEvent<Schema, Name, EventName> extends {
	attributes: infer Definitions extends Record<string, TelemetryEventAttributeDefinition>;
}
	? InferEventAttributes<Definitions>
	: never;

type SchemaSpanEventAttributeDefinitions<
	Schema extends TelemetrySchemaDefinition,
	Name extends TelemetrySchemaSpanName<Schema>,
	EventName extends TelemetrySchemaSpanEventName<Schema, Name>,
> = SchemaSpanEvent<Schema, Name, EventName> extends {
	attributes: infer Definitions extends Record<string, TelemetryEventAttributeDefinition>;
}
	? Definitions
	: Record<never, never>;

type EventArguments<
	Definitions extends Record<string, TelemetryEventAttributeDefinition>,
	Attributes extends InferEventAttributes<Definitions>,
> = [RequiredAttributeNames<Definitions>] extends [never]
	? [attributes?: ExactTelemetryAttributes<InferEventAttributes<Definitions>, Attributes>]
	: [attributes: ExactTelemetryAttributes<InferEventAttributes<Definitions>, Attributes>];

/**
 * TelemetrySpan narrowed so addEvent/setAttributes follow one schema span.
 *
 * 按 schema span 收窄的句柄。事件名和结束属性必须在词汇里。
 */
export type SchemaTelemetrySpan<
	Schema extends TelemetrySchemaDefinition,
	Name extends TelemetrySchemaSpanName<Schema>,
> = Omit<TelemetrySpan, "addEvent" | "setAttributes"> & {
	addEvent<
		EventName extends TelemetrySchemaSpanEventName<Schema, Name>,
		const Attributes extends InferEventAttributes<
			SchemaSpanEventAttributeDefinitions<Schema, Name, EventName>
		> = InferEventAttributes<SchemaSpanEventAttributeDefinitions<Schema, Name, EventName>>,
	>(
		name: EventName,
		...args: EventArguments<SchemaSpanEventAttributeDefinitions<Schema, Name, EventName>, Attributes>
	): void;
	setAttributes<const Attributes extends TelemetrySchemaSpanEndAttributes<Schema, Name>>(
		attributes: ExactTelemetryAttributes<TelemetrySchemaSpanEndAttributes<Schema, Name>, Attributes>,
	): void;
};

/**
 * Discriminated union of each schema span's name and attribute maps.
 *
 * schema 里每条 span 的 discriminated 联合。给静态枚举用。
 */
export type TelemetrySchemaSpanUnion<Schema extends TelemetrySchemaDefinition> = {
	[Name in TelemetrySchemaSpanName<Schema>]: {
		name: Name;
		startAttributes: TelemetrySchemaSpanStartAttributes<Schema, Name>;
		endAttributes: TelemetrySchemaSpanEndAttributes<Schema, Name>;
		events: {
			[EventName in TelemetrySchemaSpanEventName<Schema, Name>]: TelemetrySchemaSpanEventAttributes<
				Schema,
				Name,
				EventName
			>;
		};
	};
}[TelemetrySchemaSpanName<Schema>];

type TelemetrySchemaTuple = readonly [TelemetrySchemaDefinition, ...TelemetrySchemaDefinition[]];

type SpanNameInSchema<Schema extends TelemetrySchemaDefinition> = Schema extends TelemetrySchemaDefinition
	? TelemetrySchemaSpanName<Schema>
	: never;

type SpanNameInSchemas<Schemas extends TelemetrySchemaTuple> = SpanNameInSchema<Schemas[number]>;

type SpanStartAttributesInSchema<
	Schema extends TelemetrySchemaDefinition,
	Name extends string,
> = Schema extends TelemetrySchemaDefinition
	? Name extends TelemetrySchemaSpanName<Schema>
		? TelemetrySchemaSpanStartAttributes<Schema, Name>
		: never
	: never;

type SpanInSchema<
	Schema extends TelemetrySchemaDefinition,
	Name extends string,
> = Schema extends TelemetrySchemaDefinition
	? Name extends TelemetrySchemaSpanName<Schema>
		? SchemaTelemetrySpan<Schema, Name>
		: never
	: never;

type DuplicateTelemetrySpanNames<
	Schemas extends readonly TelemetrySchemaDefinition[],
	Seen extends string = never,
> = Schemas extends readonly [
	infer Schema extends TelemetrySchemaDefinition,
	...infer Rest extends readonly TelemetrySchemaDefinition[],
]
	?
			| Extract<TelemetrySchemaSpanName<Schema>, Seen>
			| DuplicateTelemetrySpanNames<Rest, Seen | TelemetrySchemaSpanName<Schema>>
	: never;

type UniqueTelemetrySchemas<Schemas extends TelemetrySchemaTuple> = [DuplicateTelemetrySpanNames<Schemas>] extends [
	never,
]
	? unknown
	: { readonly "duplicate telemetry span names": DuplicateTelemetrySpanNames<Schemas> };

type UnionToIntersection<Union> = (Union extends unknown ? (value: Union) => void : never) extends (
	value: infer Intersection,
) => void
	? Intersection
	: never;

type TypedSpanStarterForName<Schemas extends TelemetrySchemaTuple, Name extends SpanNameInSchemas<Schemas>> = <
	const Attributes extends SpanStartAttributesInSchema<Schemas[number], Name>,
	Result,
>(
	name: Name,
	attributes: ExactTelemetryAttributes<SpanStartAttributesInSchema<Schemas[number], Name>, Attributes>,
	callback: (
		span: SpanInSchema<Schemas[number], Name>,
		startChildSpan: TypedSpanStarter<Schemas>,
	) => Result | Promise<Result>,
) => Promise<Result>;

/**
 * A per-span overload set bound to one explicit parent context and one or more schemas.
 *
 * 绑在一个父上下文上的按名重载。多 schema 时 span 名不能重复。
 */
export type TypedSpanStarter<Schemas extends TelemetrySchemaTuple> = UnionToIntersection<
	{
		[Name in SpanNameInSchemas<Schemas>]: TypedSpanStarterForName<Schemas, Name>;
	}[SpanNameInSchemas<Schemas>]
>;

function bindTypedSpanStarter<Schemas extends TelemetrySchemaTuple>(
	telemetryContext: TelemetryContext,
): TypedSpanStarter<Schemas> {
	const startSpan = (
		name: SpanNameInSchemas<Schemas>,
		attributes: SpanAttributes,
		callback: (
			span: SpanInSchema<Schemas[number], SpanNameInSchemas<Schemas>>,
			startChildSpan: TypedSpanStarter<Schemas>,
		) => unknown,
	): Promise<unknown> =>
		telemetryContext.startSpan({ name, attributes }, (span) =>
			callback(
				span as SpanInSchema<Schemas[number], SpanNameInSchemas<Schemas>>,
				bindTypedSpanStarter<Schemas>(span),
			),
		);

	return startSpan as TypedSpanStarter<Schemas>;
}

/**
 * Bind an explicit parent context to the combined span vocabulary of one or more schemas.
 * Schema values are used only for type inference; no runtime schema validation is performed.
 *
 * 把父上下文绑到一份或多份 schema 的 span 词汇。schema 只推断类型，运行时不校验。
 */
export function createTypedSpanStarter<const Schemas extends TelemetrySchemaTuple>(
	telemetryContext: TelemetryContext,
	_schemas: Schemas & UniqueTelemetrySchemas<Schemas>,
): TypedSpanStarter<Schemas> {
	return bindTypedSpanStarter<Schemas>(telemetryContext);
}

export type { RecordedTelemetryEvent, RecordedTelemetrySpan } from "./memory.ts";
export { InMemoryTelemetryContext } from "./memory.ts";
