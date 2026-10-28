import { defineConfig } from "vitepress";

const base = "/ecma-evaluator/";

export default defineConfig({
	base,
	title: "ecma-evaluator",
	description: "A safe JavaScript expression evaluator",
	head: [
		[
			"script",
			{},
			`const path = window.location.pathname.replace(/\\/$/, "");
if (navigator.language.toLowerCase().startsWith("zh") && path === "${base.slice(0, -1)}") {
	window.location.replace("${base}zh-CN/" + window.location.search + window.location.hash);
}`,
		],
	],
	locales: {
		root: {
			label: "English",
			lang: "en-US",
			title: "ecma-evaluator",
			description: "A safe JavaScript expression evaluator",
		},
		"zh-CN": {
			label: "简体中文",
			lang: "zh-CN",
			title: "ecma-evaluator",
			description: "安全的 JavaScript 表达式求值器",
			themeConfig: {
				nav: [
					{ text: "指南", link: "/zh-CN/guide/getting-started" },
					{ text: "在线体验", link: "/zh-CN/#playground" },
				],
				sidebar: [
					{
						text: "指南",
						items: [
							{ text: "快速开始", link: "/zh-CN/guide/getting-started" },
							{ text: "参考文档", link: "/zh-CN/guide/reference" },
							{ text: "语言与安全", link: "/zh-CN/guide/language" },
						],
					},
				],
			},
		},
	},
	themeConfig: {
		socialLinks: [{ icon: "github", link: "https://github.com/axetroy/ecma-evaluator" }],
		search: {
			provider: "local",
		},
		nav: [
			{ text: "Guide", link: "/guide/getting-started" },
			{ text: "Reference", link: "/guide/reference" },
			{ text: "Playground", link: "/#playground" },
		],
		sidebar: [
			{
				text: "Guide",
				items: [
					{ text: "Getting started", link: "/guide/getting-started" },
					{ text: "Reference", link: "/guide/reference" },
					{ text: "Language & security", link: "/guide/language" },
				],
			},
		],
	},
});
