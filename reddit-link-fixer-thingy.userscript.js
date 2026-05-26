// ==UserScript==
// @name         Reddit link fixer thingy
// @namespace    https://github.com/appel/userscripts
// @version      0.1
// @description  Fixes links broken by New Reddit's aggressive markdown escaping on Old Reddit.
// @author       Ap
// @match        *://*.reddit.com/*
// @grant        none
// @license MIT
// ==/UserScript==
 
(function () {
	'use strict';
 
	// Abort immediately if we are on New Reddit (New Reddit doesn't use #header or uses a specific app div)
	// Old Reddit always has a `<div id="header">` containing the bottom border.
	if (!document.getElementById('header')) {
		return;
	}
 
	function fixLinks(node) {
		const links = node.nodeName === 'A' ? [node] : node.querySelectorAll ? node.querySelectorAll('a') : [];
 
		links.forEach((link) => {
			let href = link.getAttribute('href');
			if (!href) return;
 
			let updated = false;
 
			if (href.includes('%5C_') || href.includes('\\_') || href.includes('%5C~') || href.includes('\\~')) {
				href = href.replace(/%5C_/g, '_').replace(/\\_/g, '_').replace(/%5C~/g, '~').replace(/\\~/g, '~');
 
				link.setAttribute('href', href);
				updated = true;
			}
 
			if (updated && link.textContent) {
				link.textContent = link.textContent.replace(/\\_/g, '_').replace(/\\~/g, '~');
			}
		});
	}
 
	// Initial run: Only target markdown bodies to save processing time
	document.querySelectorAll('.md').forEach(fixLinks);
 
	// Optimized Observer: Only trigger if the added node contains markdown text
	const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			mutation.addedNodes.forEach((node) => {
				if (node.nodeType === Node.ELEMENT_NODE) {
					// Check if the node itself is a markdown block, or if it contains them (like a new comment tree)
					if (node.classList && node.classList.contains('md')) {
						fixLinks(node);
					} else if (node.querySelectorAll) {
						const mdNodes = node.querySelectorAll('.md');
						mdNodes.forEach(fixLinks);
					}
				}
			});
		});
	});
 
	// We can restrict the observer to the main content area (siteTable) if it exists
	const container = document.querySelector('.sitetable') || document.body;
	observer.observe(container, { childList: true, subtree: true });
})();
