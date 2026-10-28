<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import TypeScriptWorker from "monaco-editor/language/typescript/ts.worker.js?worker";
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
const apiEditorElement = ref(null);
const apiEditorReady = ref(false);
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

	return `${functionName}(\n\t${JSON.stringify(source.value)},\n${contextSource}\n);`;
});
const apiEditorHeight = computed(
	() => `${Math.min(Math.max(apiCall.value.split("\n").length * 20 + 20, 120), 360)}px`,
);
let apiEditor;
let componentUnmounted = false;

onMounted(async () => {
	try {
		const monaco = await import("monaco-editor");

		if (componentUnmounted || !apiEditorElement.value) {
			return;
		}

		self.MonacoEnvironment = {
			getWorker(_workerId, label) {
				return label === "javascript" || label === "typescript"
					? new TypeScriptWorker()
					: new EditorWorker();
			},
		};

		apiEditor = monaco.editor.create(apiEditorElement.value, {
			value: apiCall.value,
			language: "javascript",
			theme: "vs-dark",
			readOnly: true,
			domReadOnly: true,
			automaticLayout: true,
			minimap: { enabled: false },
			lineNumbers: "on",
			folding: false,
			wordWrap: "on",
			renderLineHighlight: "none",
			scrollBeyondLastLine: false,
			fontSize: 13,
			lineHeight: 20,
			padding: { top: 10, bottom: 10 },
		});
		apiEditorReady.value = true;
	} catch (cause) {
		console.error("Failed to load Monaco Editor", cause);
	}
});

watch(apiCall, (value) => {
	apiEditor?.setValue(value);
});

watch(apiEditorHeight, () => {
	apiEditor?.layout();
});

onBeforeUnmount(() => {
	componentUnmounted = true;
	apiEditor?.dispose();
});

function applyExample() {
	const example = examples[mode.value].find(
		(item) => item.id === selectedExample.value,
	);

	if (example) {
		source.value = example.source;
		context.value = example.context;
	}

	error.value = "";
	result.value = "";
}

function changeMode() {
	selectedExample.value = examples[mode.value][0].id;
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
}
</script>

<template>
	<div class="playground">
		<div class="playground__controls">
			<label>
				<span>{{ isChinese ? "模式" : "Mode" }}</span>
				<select v-model="mode" @change="changeMode">
					<option value="expression">{{ isChinese ? "表达式" : "Expression" }}</option>
					<option value="template">{{ isChinese ? "模板" : "Template" }}</option>
				</select>
			</label>
			<label>
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
		</div>

		<label class="playground__field">
			<span>{{ isChinese ? "表达式或模板" : "Expression or template" }}</span>
			<textarea v-model="source" rows="4" spellcheck="false" />
		</label>

		<label class="playground__field">
			<span>{{ isChinese ? "上下文（JSON）" : "Context (JSON)" }}</span>
			<textarea v-model="context" rows="5" spellcheck="false" />
		</label>

		<button class="playground__run" type="button" @click="run">
			{{ isChinese ? "运行" : "Run" }}
		</button>

		<div class="playground__output playground__api-call">
			<span>{{ isChinese ? "API 调用" : "API call" }}</span>
			<div
				class="playground__editor"
				role="region"
				:aria-label="isChinese ? 'API 调用代码' : 'API call code'"
				:style="{ height: apiEditorHeight }"
			>
				<div ref="apiEditorElement" class="playground__editor-canvas" />
				<pre v-if="!apiEditorReady" class="playground__editor-fallback">{{ apiCall }}</pre>
			</div>
		</div>

		<div v-if="result || error" class="playground__output" aria-live="polite">
			<span>{{ isChinese ? "结果" : "Result" }}</span>
			<pre :class="{ 'playground__error': error }">{{ error || result }}</pre>
		</div>
	</div>
</template>

<style scoped>
.playground {
	display: grid;
	gap: 1rem;
	margin: 1.5rem 0 3rem;
	padding: 1.25rem;
	border: 1px solid var(--vp-c-divider);
	border-radius: 12px;
	background: var(--vp-c-bg-soft);
}

.playground__controls,
.playground__field {
	display: grid;
	gap: 0.5rem;
}

.playground__controls {
	grid-template-columns: minmax(10rem, 16rem);
}

.playground__field span,
.playground__controls span,
.playground__output > span {
	font-size: 0.875rem;
	font-weight: 600;
}

.playground textarea,
.playground select {
	width: 100%;
	padding: 0.75rem;
	border: 1px solid var(--vp-c-divider);
	border-radius: 6px;
	color: var(--vp-c-text-1);
	background: var(--vp-c-bg);
	font: inherit;
}

.playground textarea {
	resize: vertical;
	font-family: var(--vp-font-family-mono);
}

.playground__run {
	justify-self: start;
	padding: 0.55rem 1.25rem;
	border: 0;
	border-radius: 6px;
	color: var(--vp-c-white);
	background: var(--vp-c-brand-1);
	font: inherit;
	font-weight: 600;
	cursor: pointer;
}

.playground__run:hover {
	background: var(--vp-c-brand-2);
}

.playground__output pre {
	overflow: auto;
	margin-top: 0.5rem;
	padding: 0.75rem;
	border-radius: 6px;
	background: var(--vp-c-bg);
	white-space: pre-wrap;
}

.playground__editor {
	position: relative;
	overflow: hidden;
	margin-top: 0.5rem;
	border: 1px solid var(--vp-c-divider);
	border-radius: 6px;
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
	overflow: auto;
	margin: 0;
	padding: 10px 1rem;
	color: #d4d4d4;
	background: #1e1e1e;
	font-family: var(--vp-font-family-mono);
	font-size: 13px;
	line-height: 20px;
	white-space: pre;
}

.playground__output .playground__error {
	color: var(--vp-c-danger-1);
}
</style>
