import { defineConfig } from "vitepress";

export default defineConfig({
	base: "/ecma-evaluator/",
	title: "ecma-evaluator",
	description: "A safe JavaScript expression evaluator",
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
		},
	},
	themeConfig: {
		socialLinks: [{ icon: "github", link: "https://github.com/axetroy/ecma-evaluator" }],
		search: {
			provider: "local",
		},
		nav: [
			{ text: "Guide", link: "/guide/getting-started" },
			{ text: "Playground", link: "/#playground" },
		],
		sidebar: [
			{
				text: "Guide",
				items: [{ text: "Getting started", link: "/guide/getting-started" }],
			},
		],
		locales: {
			"zh-CN": {
				nav: [
					{ text: "指南", link: "/zh-CN/guide/getting-started" },
					{ text: "在线体验", link: "/zh-CN/#playground" },
				],
				sidebar: [
					{
						text: "指南",
						items: [{ text: "快速开始", link: "/zh-CN/guide/getting-started" }],
					},
				],
			},
		},
	},
});
