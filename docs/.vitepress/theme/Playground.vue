<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { evalExpression, evalTemplate } from "../../../src/index.js";

const props = defineProps({
	locale: {
		type: String,
		default: "en",
	},
});

const isChinese = computed(() => props.locale === "zh-CN");
const mode = ref("expression");
const examples = {
	expression: [
		{
			id: "arithmetic",
			label: { en: "Arithmetic", zh: "算术运算" },
			source: "a + b * c",
			context: '{\n  "a": 1,\n  "b": 2,\n  "c": 3\n}',
		},
		{
			id: "conditional",
			label: { en: "Conditional expression", zh: "条件表达式" },
			source: 'user.isMember ? "Welcome back, " + user.name : "Join us, " + user.name',
			context: '{\n  "user": {\n    "name": "Ada",\n    "isMember": true\n  }\n}',
		},
		{
			id: "array",
			label: { en: "Array methods", zh: "数组方法" },
			source: "scores.map(score => score * 2)",
			context: '{\n  "scores": [10, 20, 30]\n}',
		},
	],
	template: [
		{
			id: "greeting",
			label: { en: "Personalized greeting", zh: "个性化问候" },
			source: "Hello, {{ user.name }}!",
			context: '{\n  "user": {\n    "name": "Ada"\n  }\n}',
		},
		{
			id: "conditional",
			label: { en: "Conditional template", zh: "条件模板" },
			source: '{{ user.isMember ? "Welcome back, " + user.name : "Join us, " + user.name }}!',
			context: '{\n  "user": {\n    "name": "Ada",\n    "isMember": true\n  }\n}',
		},
		{
			id: "product",
			label: { en: "Product description", zh: "商品介绍" },
			source: "{{ product.name }} — ${{ product.price }}",
			context: '{\n  "product": {\n    "name": "Notebook",\n    "price": 12.5\n  }\n}',
		},
	],
};

const selectedExample = ref(examples.expression[0].id);
const source = ref(examples.expression[0].source);
const context = ref(examples.expression[0].context);
const result = ref("");
const error = ref("");
const hasRun = ref(false);
const lastRunInput = ref("");
const copyState = ref("idle");
const apiEditorElement = ref(null);
const contextEditorElement = ref(null);
const apiEditorReady = ref(false);
const contextEditorReady = ref(false);
const inputSnapshot = computed(() =>
	JSON.stringify([mode.value, source.value, context.value]),
);
const runState = computed(() => {
	if (!hasRun.value || lastRunInput.value !== inputSnapshot.value) {
		return "idle";
	}

	return error.value ? "error" : "success";
});
const runStateLabel = computed(() => {
	if (runState.value === "error") {
		return isChinese.value ? "运行错误" : "Error";
	}
	if (runState.value === "success") {
		return isChinese.value ? "已完成" : "Complete";
	}
	return isChinese.value ? "待运行" : "Ready to run";
});
const apiCall = computed(() => {
	const functionName =
		mode.value === "template" ? "evalTemplate" : "evalExpression";
	let formattedContext;

	try {
		formattedContext =
			JSON.stringify(JSON.parse(context.value || "{}"), null, 2) ?? "{}";
		if (formattedContext === "{}") {
			formattedContext = "{\n}";
		}
	} catch {
		formattedContext = context.value || "{}";
	}

	const contextSource = formattedContext
		.split("\n")
		.map((line) => `\t${line}`)
		.join("\n");

	return `import { ${functionName} } from "ecma-evaluator";\n\n${functionName}(\n\t${JSON.stringify(source.value)},\n${contextSource}\n);`;
});

let apiEditor;
let contextEditor;
let monacoLoadPromise;
let componentUnmounted = false;
let copyTimeout;
let loadOnPageLoad;

function loadMonaco() {
	if (monacoLoadPromise) {
		return monacoLoadPromise;
	}

	monacoLoadPromise = (async () => {
		try {
			const [monacoModule, editorWorkerModule, jsonWorkerModule, typeScriptWorkerModule] =
				await Promise.all([
					import("monaco-editor"),
					import("monaco-editor/editor/editor.worker.js?worker"),
					import("monaco-editor/language/json/json.worker.js?worker"),
					import("monaco-editor/language/typescript/ts.worker.js?worker"),
				]);

			if (
				componentUnmounted ||
				!apiEditorElement.value ||
				!contextEditorElement.value
			) {
				return;
			}

			const monaco = monacoModule;
			const EditorWorker = editorWorkerModule.default;
			const JsonWorker = jsonWorkerModule.default;
			const TypeScriptWorker = typeScriptWorkerModule.default;

			self.MonacoEnvironment = {
				getWorker(_workerId, label) {
					if (label === "json") {
						return new JsonWorker();
					}
					return label === "javascript" || label === "typescript"
						? new TypeScriptWorker()
						: new EditorWorker();
				},
			};

			const editorOptions = {
				theme: "vs-dark",
				automaticLayout: true,
				minimap: { enabled: false },
				lineNumbers: "on",
				folding: false,
				wordWrap: "on",
				renderLineHighlight: "line",
				scrollBeyondLastLine: false,
				fontSize: 13,
				lineHeight: 20,
				padding: { top: 10, bottom: 10 },
			};

			contextEditor = monaco.editor.create(contextEditorElement.value, {
				...editorOptions,
				value: context.value,
				language: "json",
			});
			contextEditor.onDidChangeModelContent(() => {
				const value = contextEditor.getValue();
				if (context.value !== value) {
					context.value = value;
				}
			});
			contextEditorReady.value = true;

			apiEditor = monaco.editor.create(apiEditorElement.value, {
				...editorOptions,
				value: apiCall.value,
				language: "javascript",
				readOnly: true,
				domReadOnly: true,
				renderLineHighlight: "none",
			});
			apiEditorReady.value = true;
		} catch (cause) {
			monacoLoadPromise = undefined;
			console.error("Failed to load Monaco Editor", cause);
		}
	})();

	return monacoLoadPromise;
}

onMounted(() => {
	if (document.readyState === "complete") {
		loadMonaco();
		return;
	}

	loadOnPageLoad = () => {
		loadOnPageLoad = undefined;
		loadMonaco();
	};
	window.addEventListener("load", loadOnPageLoad, { once: true });
});

watch(apiCall, (value) => {
	apiEditor?.setValue(value);
});

watch(context, (value) => {
	if (contextEditor && contextEditor.getValue() !== value) {
		contextEditor.setValue(value);
	}
});

onBeforeUnmount(() => {
	componentUnmounted = true;
	if (loadOnPageLoad) {
		window.removeEventListener("load", loadOnPageLoad);
	}
	apiEditor?.dispose();
	contextEditor?.dispose();
	clearTimeout(copyTimeout);
});

function applyExample() {
	const example = examples[mode.value].find(
		(item) => item.id === selectedExample.value,
	);

	if (example) {
		source.value = example.source;
		context.value = example.context;
	}

	run();
}

function changeMode(nextMode) {
	if (nextMode === mode.value) {
		return;
	}

	mode.value = nextMode;
	selectedExample.value = examples[nextMode][0].id;
	applyExample();
}

function run() {
	error.value = "";
	result.value = "";

	try {
		const variables = JSON.parse(context.value || "{}");
		const value =
			mode.value === "template"
				? evalTemplate(source.value, variables)
				: evalExpression(source.value, variables);

		result.value =
			value === undefined
				? "undefined"
				: typeof value === "string"
					? value
					: (JSON.stringify(value, null, 2) ?? String(value));
	} catch (cause) {
		error.value = cause instanceof Error ? cause.message : String(cause);
	}

	hasRun.value = true;
	lastRunInput.value = inputSnapshot.value;
}

async function copyApiCall() {
	try {
		await navigator.clipboard.writeText(apiCall.value);
		copyState.value = "copied";
	} catch {
		copyState.value = "error";
	}

	clearTimeout(copyTimeout);
	copyTimeout = setTimeout(() => {
		copyState.value = "idle";
	}, 1800);
}

run();
</script>

<template>
	<div
		class="playground"
		@keydown.ctrl.enter.prevent="run"
		@keydown.meta.enter.prevent="run"
	>
		<header class="playground__toolbar">
			<div
				class="playground__mode"
				role="group"
				:aria-label="isChinese ? '运行模式' : 'Evaluation mode'"
			>
				<button
					:aria-pressed="mode === 'expression'"
					class="playground__mode-button"
					:class="{ 'is-active': mode === 'expression' }"
					type="button"
					@click="changeMode('expression')"
				>
					{{ isChinese ? "表达式" : "Expression" }}
				</button>
				<button
					:aria-pressed="mode === 'template'"
					class="playground__mode-button"
					:class="{ 'is-active': mode === 'template' }"
					type="button"
					@click="changeMode('template')"
				>
					{{ isChinese ? "模板" : "Template" }}
				</button>
			</div>

			<label class="playground__example">
				<span>{{ isChinese ? "示例" : "Example" }}</span>
				<select v-model="selectedExample" @change="applyExample">
					<option
						v-for="example in examples[mode]"
						:key="example.id"
						:value="example.id"
					>
						{{ isChinese ? example.label.zh : example.label.en }}
					</option>
				</select>
			</label>

			<div class="playground__toolbar-spacer" />

			<button class="playground__run" type="button" @click="run">
				<span>{{ isChinese ? "运行" : "Run" }}</span>
				<kbd>Ctrl / Cmd + Enter</kbd>
			</button>
		</header>

		<div class="playground__workspace">
			<section class="playground__panel playground__source">
				<div class="playground__field-heading">
					<label for="playground-source">{{ isChinese ? "表达式或模板" : "Expression or template" }}</label>
					<span>{{ mode === "template" ? "TEXT + JS" : "JAVASCRIPT" }}</span>
				</div>
				<textarea
					id="playground-source"
					v-model="source"
					spellcheck="false"
					:placeholder="isChinese ? '输入表达式…' : 'Enter an expression…'"
				/>
			</section>

			<section class="playground__panel playground__result">
				<div class="playground__output-heading">
					<span>{{ isChinese ? "结果" : "Result" }}</span>
					<span
						class="playground__status"
						:class="`is-${runState}`"
						aria-live="polite"
					>
						<i aria-hidden="true" />
						{{ runStateLabel }}
					</span>
				</div>
				<pre
					class="playground__result-value"
					:class="{ 'is-error': error && runState === 'error', 'is-placeholder': runState === 'idle' }"
					aria-live="polite"
				>{{ runState === "idle" ? (isChinese ? "编辑输入后运行，即可查看结果。" : "Edit the input and run to see a result.") : error || result }}</pre>
			</section>

			<section class="playground__panel playground__context">
				<div class="playground__field-heading">
					<span>{{ isChinese ? "上下文" : "Context" }}</span>
					<span>JSON</span>
				</div>
				<div
					class="playground__editor"
					role="region"
					:aria-label="isChinese ? '上下文 JSON 编辑器' : 'Context JSON editor'"
				>
					<div ref="contextEditorElement" class="playground__editor-canvas" />
					<textarea
						v-if="!contextEditorReady"
						v-model="context"
						class="playground__editor-fallback"
						spellcheck="false"
						:aria-label="isChinese ? '上下文 JSON' : 'Context JSON'"
					/>
				</div>
			</section>

			<section class="playground__panel playground__api-call">
				<div class="playground__output-heading">
					<span>{{ isChinese ? "对应 API 调用" : "Equivalent API call" }}</span>
					<button
						class="playground__copy"
						type="button"
						:title="isChinese ? '复制 API 调用' : 'Copy API call'"
						@click="copyApiCall"
					>
						{{
							copyState === "copied"
								? isChinese ? "已复制" : "Copied"
								: copyState === "error"
									? isChinese ? "复制失败" : "Copy failed"
									: isChinese ? "复制代码" : "Copy code"
						}}
					</button>
				</div>
				<div
					class="playground__editor"
					role="region"
					:aria-label="isChinese ? 'API 调用代码' : 'API call code'"
				>
					<div ref="apiEditorElement" class="playground__editor-canvas" />
					<pre v-if="!apiEditorReady" class="playground__editor-fallback">{{ apiCall }}</pre>
				</div>
			</section>
		</div>
	</div>
</template>

<style scoped>
.playground {
	overflow: hidden;
	margin: 1.5rem 0 3rem;
	border: 1px solid var(--vp-c-divider);
	border-radius: 8px;
	background: var(--vp-c-bg);
}

.playground__toolbar {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	min-height: 4rem;
	padding: 0.65rem 1rem;
	border-bottom: 1px solid var(--vp-c-divider);
	background: var(--vp-c-bg-soft);
}

.playground__mode {
	display: inline-flex;
	flex: 0 0 auto;
	gap: 0.2rem;
	padding: 0.2rem;
	border: 1px solid var(--vp-c-divider);
	border-radius: 6px;
	background: var(--vp-c-bg);
}

.playground__mode-button {
	min-height: 2rem;
	padding: 0.35rem 0.7rem;
	border: 0;
	border-radius: 4px;
	color: var(--vp-c-text-2);
	background: transparent;
	font: inherit;
	font-size: 0.8125rem;
	cursor: pointer;
}

.playground__mode-button.is-active {
	color: var(--vp-c-text-1);
	background: var(--vp-c-bg-soft);
	box-shadow: 0 1px 2px rgb(0 0 0 / 12%);
}

.playground__example {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	min-width: 0;
	color: var(--vp-c-text-2);
	font-size: 0.8125rem;
}

.playground__example select {
	max-width: 15rem;
	min-height: 2.4rem;
	padding: 0.35rem 2rem 0.35rem 0.65rem;
	border: 1px solid var(--vp-c-divider);
	border-radius: 5px;
	color: var(--vp-c-text-1);
	background: var(--vp-c-bg);
	font: inherit;
	cursor: pointer;
}

.playground__toolbar-spacer {
	flex: 1;
}

.playground__run {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.75rem;
	min-height: 2.5rem;
	padding: 0.45rem 0.75rem 0.45rem 0.9rem;
	border: 1px solid var(--vp-c-brand-1);
	border-radius: 5px;
	color: var(--vp-c-white);
	background: var(--vp-c-brand-1);
	font: inherit;
	font-size: 0.875rem;
	font-weight: 600;
	cursor: pointer;
}

.playground__run:hover {
	background: var(--vp-c-brand-2);
}

.playground__run kbd {
	padding: 0.1rem 0.3rem;
	border: 1px solid rgb(255 255 255 / 35%);
	border-radius: 3px;
	color: inherit;
	font: inherit;
	font-size: 0.6875rem;
	font-weight: 500;
}

.playground__workspace {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	grid-template-rows: repeat(2, minmax(16rem, 1fr));
	grid-template-areas:
		"source result"
		"context api";
	min-height: 36rem;
}

.playground__panel {
	display: grid;
	grid-template-rows: 2rem minmax(0, 1fr);
	gap: 0.6rem;
	min-width: 0;
	min-height: 0;
	padding: 1rem;
}

.playground__source {
	grid-area: source;
}

.playground__result {
	grid-area: result;
}

.playground__context {
	grid-area: context;
}

.playground__api-call {
	grid-area: api;
}

.playground__source,
.playground__context {
	border-right: 1px solid var(--vp-c-divider);
}

.playground__source,
.playground__result {
	border-bottom: 1px solid var(--vp-c-divider);
}

.playground__result,
.playground__api-call {
	background: var(--vp-c-bg-soft);
}

.playground__field-heading,
.playground__output-heading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
	height: 2rem;
	min-height: 2rem;
}

.playground__field-heading label,
.playground__field-heading > span:first-child,
.playground__output-heading > span:first-child {
	color: var(--vp-c-text-1);
	font-size: 0.875rem;
	font-weight: 600;
}

.playground__field-heading > span:last-child {
	color: var(--vp-c-text-3);
	font-family: var(--vp-font-family-mono);
	font-size: 0.6875rem;
}

.playground__source textarea {
	width: 100%;
	min-width: 0;
	min-height: 0;
	padding: 0.75rem;
	resize: none;
	border: 1px solid var(--vp-c-divider);
	border-radius: 5px;
	color: var(--vp-c-text-1);
	background: var(--vp-c-bg);
	font-family: var(--vp-font-family-mono);
	font-size: 0.875rem;
	line-height: 1.65;
	tab-size: 2;
}

.playground__source textarea:focus,
.playground__example select:focus-visible,
.playground__mode-button:focus-visible,
.playground__run:focus-visible,
.playground__copy:focus-visible {
	outline: 2px solid var(--vp-c-brand-1);
	outline-offset: 2px;
}

.playground__status {
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	color: var(--vp-c-text-3);
	font-size: 0.75rem;
}

.playground__status i {
	width: 0.45rem;
	height: 0.45rem;
	border-radius: 50%;
	background: var(--vp-c-text-3);
}

.playground__status.is-success i {
	background: #3a9b64;
}

.playground__status.is-error i {
	background: var(--vp-c-danger-1);
}

.playground__result-value {
	min-width: 0;
	min-height: 0;
	overflow: auto;
	margin: 0;
	padding: 0.8rem 0.9rem;
	border: 1px solid var(--vp-c-divider);
	border-radius: 5px;
	color: var(--vp-c-text-1);
	background: var(--vp-c-bg);
	font-family: var(--vp-font-family-mono);
	font-size: 0.875rem;
	line-height: 1.6;
	white-space: pre-wrap;
}

.playground__result-value.is-placeholder {
	color: var(--vp-c-text-3);
	font-family: inherit;
	font-size: 0.8125rem;
}

.playground__result-value.is-error {
	color: var(--vp-c-danger-1);
}

.playground__copy {
	padding: 0.25rem 0.45rem;
	border: 1px solid var(--vp-c-divider);
	border-radius: 4px;
	color: var(--vp-c-text-2);
	background: var(--vp-c-bg);
	font: inherit;
	font-size: 0.75rem;
	cursor: pointer;
}

.playground__copy:hover {
	color: var(--vp-c-text-1);
	border-color: var(--vp-c-text-3);
}

.playground__editor {
	position: relative;
	width: 100%;
	min-width: 0;
	min-height: 0;
	overflow: hidden;
	border: 1px solid var(--vp-c-divider);
	border-radius: 5px;
	background: #1e1e1e;
}

.playground__editor-canvas {
	width: 100%;
	height: 100%;
	min-height: 0;
	text-align: left;
	font-family: var(--vp-font-family-mono);
	font-size: 13px;
	line-height: 20px;
}

.playground__editor-fallback {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	padding: 0.75rem;
	resize: none;
	border: 0;
	color: #d4d4d4;
	background: #1e1e1e;
	font-family: var(--vp-font-family-mono);
	font-size: 13px;
	line-height: 20px;
	white-space: pre;
}

@media (max-width: 760px) {
	.playground__toolbar {
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.playground__toolbar-spacer {
		display: none;
	}

	.playground__example {
		flex: 1 1 10rem;
	}

	.playground__example select {
		flex: 1;
		min-width: 0;
	}

	.playground__run {
		margin-left: auto;
	}

	.playground__workspace {
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: none;
		grid-template-areas:
			"source"
			"context"
			"result"
			"api";
		min-height: 0;
	}

	.playground__panel {
		min-height: 17rem;
		border-right: 0;
		border-bottom: 1px solid var(--vp-c-divider);
	}

	.playground__api-call {
		border-bottom: 0;
	}
}

@media (max-width: 420px) {
	.playground__toolbar {
		padding: 0.7rem;
	}

	.playground__panel {
		padding: 0.8rem;
	}

	.playground__run {
		gap: 0.4rem;
	}

	.playground__run kbd {
		font-size: 0.625rem;
	}
}
</style>
