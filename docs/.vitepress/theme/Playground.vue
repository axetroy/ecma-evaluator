<script setup>
import { computed, ref } from "vue";
import { evalExpression, evalTemplate } from "../../../src/index.js";

const props = defineProps({
	locale: {
		type: String,
		default: "en",
	},
});

const isChinese = computed(() => props.locale === "zh-CN");
const mode = ref("expression");
const source = ref("a + b * c");
const context = ref('{\n  "a": 1,\n  "b": 2,\n  "c": 3\n}');
const result = ref("");
const error = ref("");

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
				<select v-model="mode">
					<option value="expression">{{ isChinese ? "表达式" : "Expression" }}</option>
					<option value="template">{{ isChinese ? "模板" : "Template" }}</option>
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

.playground__output .playground__error {
	color: var(--vp-c-danger-1);
}
</style>
