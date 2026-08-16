// ==UserScript==
// @name         Gmail Rail Icons
// @namespace    https://github.com/appel/userscripts
// @version      0.2.0
// @description  Mirrors the Compose button and label icons into Gmail's narrow left rail so a collapsed sidebar stays usable on a portrait monitor.
// @match        https://mail.google.com/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @license      MIT
// ==/UserScript==
 
(function () {
	"use strict";
 
	/* ------------------------------------------------------------------ *
	 * CONFIG
	 * ------------------------------------------------------------------ */
	const CONFIG = {
		// Which labels appear is managed from the userscript manager menu
		// ("Choose labels") or the cog at the bottom of the rail. Everything
		// shows by default; the picker stores only the ones you switch OFF.
		MAX_ITEMS: 0, // 0 = no limit
 
		SHOW_COMPOSE: true,
		SHOW_SETTINGS: true, // cog at the bottom of the rail
		SETTINGS_AT_BOTTOM: true, // pin the cog to the foot of the rail
		REPO_URL: "https://github.com/appel/userscripts",
		SHOW_BADGES: true, // unread counts as a small pill
		SHOW_TOOLTIPS: true, // native title= tooltips
 
		// Open the picker once, the first time the script runs.
		SHOW_PICKER_ON_FIRST_RUN: true,
 
		HIGHLIGHT_ACTIVE: true,
 
		ICON_SIZE: 20,
		BUTTON_SIZE: 40,
		GAP: 0,
		TOP_MARGIN: 32, // space between Chat and our first icon
		TOP_BORDER: "1px dotted #666",
		TOP_PADDING: 32,
 
		// Picker gets a second column above this viewport width.
		WIDE_BREAKPOINT: 1200,
		CARD_WIDTH: 320,
		CARD_WIDTH_WIDE: 720,
 
		// Used only if the rail element can't be identified and the script
		// falls back to a fixed-position strip.
		FALLBACK_LEFT: 8,
		FALLBACK_TOP: 230,
		FALLBACK_WIDTH: 56,
 
		POLL_MS: 2000, // safety net on top of the MutationObserver
 
		DEBUG: false,
	};
 
	/* ------------------------------------------------------------------ *
	 * Utilities
	 * ------------------------------------------------------------------ */
	const ID = "mk-gmail-rail";
	const PICKER_ID = "mk-gmail-rail-picker";
	const STORE_KEY = "mkRailHiddenIds";
	const SEEN_KEY = "mkRailPickerSeen";
	const log = (...a) => CONFIG.DEBUG && console.log("[rail]", ...a);
 
	const debounce = (fn, ms) => {
		let t;
		return (...a) => {
			clearTimeout(t);
			t = setTimeout(() => fn(...a), ms);
		};
	};
 
	/* ------------------------------------------------------------------ *
	 * Persistence — we store the HIDDEN ids, never the visible ones.
	 * An empty set therefore means "show everything", so labels created
	 * later show up on their own and nothing has to stay in sync.
	 * ------------------------------------------------------------------ */
	const hasGM = typeof GM_getValue === "function" && typeof GM_setValue === "function";
 
	function loadHidden() {
		try {
			const raw = hasGM ? GM_getValue(STORE_KEY, "[]") : localStorage.getItem(STORE_KEY) || "[]";
			const parsed = JSON.parse(raw);
			return new Set(Array.isArray(parsed) ? parsed : []);
		} catch (e) {
			console.warn("[rail] could not read saved selection, showing all:", e);
			return new Set();
		}
	}
 
	function saveHidden(set) {
		const raw = JSON.stringify([...set]);
		try {
			if (hasGM) GM_setValue(STORE_KEY, raw);
			else localStorage.setItem(STORE_KEY, raw);
		} catch (e) {
			console.error("[rail] could not save selection:", e);
		}
	}
 
	let hidden = loadHidden();
 
	/* ------------------------------------------------------------------ *
	 * Toggles — CONFIG holds the defaults, the picker stores overrides.
	 * Only keys the user has actually changed are persisted, so editing a
	 * CONFIG default still takes effect for anything untouched.
	 * ------------------------------------------------------------------ */
	const OPTS_KEY = "mkRailOptions";
 
	const OPTION_DEFS = [
		{ key: "SHOW_COMPOSE", label: "Compose button" },
		{ key: "SHOW_BADGES", label: "Unread count badges" },
		{ key: "SHOW_SETTINGS", label: "Settings cog in the rail" },
		{ key: "SETTINGS_AT_BOTTOM", label: "Pin the cog to the bottom" },
	];
 
	function loadOpts() {
		try {
			const raw = hasGM ? GM_getValue(OPTS_KEY, "{}") : localStorage.getItem(OPTS_KEY) || "{}";
			const parsed = JSON.parse(raw);
			return parsed && typeof parsed === "object" ? parsed : {};
		} catch (e) {
			console.warn("[rail] could not read saved options, using defaults:", e);
			return {};
		}
	}
 
	function saveOpts(o) {
		try {
			const raw = JSON.stringify(o);
			if (hasGM) GM_setValue(OPTS_KEY, raw);
			else localStorage.setItem(OPTS_KEY, raw);
		} catch (e) {
			console.error("[rail] could not save options:", e);
		}
	}
 
	let opts = loadOpts();
 
	// Read a toggle: saved override first, CONFIG default otherwise.
	function opt(key) {
		return Object.prototype.hasOwnProperty.call(opts, key) ? !!opts[key] : !!CONFIG[key];
	}
 
	function loadFlag(key) {
		try {
			return (hasGM ? GM_getValue(key, "") : localStorage.getItem(key)) === "1";
		} catch (e) {
			return false;
		}
	}
 
	function saveFlag(key) {
		try {
			if (hasGM) GM_setValue(key, "1");
			else localStorage.setItem(key, "1");
		} catch (e) {
			console.error("[rail] could not save flag", key, e);
		}
	}
 
	/* ------------------------------------------------------------------ *
	 * Locating Gmail's bits — attribute-based, no obfuscated classes
	 * ------------------------------------------------------------------ */
	// The narrow strip (Menu / Mail / Chat).
	function getStrip() {
		return document.querySelector('div[role="navigation"][jscontroller="s6IIOd"]');
	}
 
	// The wider label menu — a SIBLING of the strip, not a child of it.
	function getLabelRoot() {
		return (
			document.querySelector('div[jscontroller="nwtiKd"]') ||
			document.querySelector('div[jsaction*="rcuQ6b:npT2md"]')
		);
	}
 
	function getNav() {
		return getStrip() || getLabelRoot()?.parentElement;
	}
 
	function getComposeButton() {
		return (
			document.querySelector('div[role="button"][jscontroller="eIu7Db"]') ||
			document.querySelector('div[role="button"][jslog*="20510"]') ||
			[...document.querySelectorAll('div[role="button"]')].find((el) => el.textContent.trim() === "Compose")
		);
	}
 
	// Label rows: <div data-tooltip="Inbox" data-tooltip-align="r"> containing a hash link.
	function getLabelRows() {
		const root = getLabelRoot() || document;
		return [...root.querySelectorAll('[data-tooltip][data-tooltip-align="r"]')].filter((row) =>
			row.querySelector('a[href*="#"]'),
		);
	}
 
	function findRailHost() {
		const strip = getStrip();
		if (strip) {
			log("rail host = strip", strip);
			return strip;
		}
		log("no strip found — using floating fallback");
		return null;
	}
 
	/* ------------------------------------------------------------------ *
	 * Reading the model out of the DOM
	 * ------------------------------------------------------------------ */
	let cachedItems = [];
 
	function pickIcon(row) {
		const svgs = [...row.querySelectorAll("svg")];
		if (!svgs.length) return null;
		// Gmail keeps an outline + filled pair and toggles one via CSS.
		const visible = svgs.find((s) => s.getBoundingClientRect().width > 0);
		return (visible || svgs[0]).cloneNode(true);
	}
 
	function readUnread(row) {
		const a = row.querySelector("a[aria-label]");
		const m = a && a.getAttribute("aria-label").match(/(\d[\d,]*)\s+unread/i);
		return m ? m[1] : null;
	}
 
	// Every label the sidebar currently offers, before any filtering.
	// The picker and the rail both build on this, so they can't disagree.
	function readAllItems() {
		const items = [];
		const seen = new Set();
 
		for (const row of getLabelRows()) {
			const name = row.getAttribute("data-tooltip");
			const link = row.querySelector('a[href*="#"]');
			if (!name || !link) continue;
 
			const href = link.getAttribute("href");
			const hash = (href.split("#")[1] || "").toLowerCase();
			const id = hash || name; // stable across renames of siblings
			if (seen.has(id)) continue;
			seen.add(id);
 
			items.push({ id, name, href, hash, icon: pickIcon(row), unread: readUnread(row) });
		}
		return items;
	}
 
	function readItems() {
		const all = readAllItems();
		if (!all.length) return cachedItems; // Gmail mid-render; keep what we had
 
		let items = all.filter((i) => !hidden.has(i.id));
		if (CONFIG.MAX_ITEMS > 0) items = items.slice(0, CONFIG.MAX_ITEMS);
 
		cachedItems = items;
		return items;
	}
 
	/* ------------------------------------------------------------------ *
	 * Activating the originals
	 * ------------------------------------------------------------------ */
	// jsaction handlers stay bound while hidden, but a click on a display:none
	// node won't always dispatch — so unhide the chain, click, put it back.
	function forceClick(el) {
		if (!el) return;
		const undo = [];
		let n = el;
		while (n && n !== document.body) {
			const cs = getComputedStyle(n);
			if (cs.display === "none" || cs.visibility === "hidden") {
				undo.push([n, n.getAttribute("style")]);
				n.style.setProperty("display", "block", "important");
				n.style.setProperty("visibility", "visible", "important");
				n.style.setProperty("position", "absolute", "important");
				n.style.setProperty("left", "-99999px", "important");
			}
			n = n.parentElement;
		}
		el.click();
		for (const [node, style] of undo) {
			if (style === null) node.removeAttribute("style");
			else node.setAttribute("style", style);
		}
	}
 
	/* ------------------------------------------------------------------ *
	 * Styles
	 * ------------------------------------------------------------------ */
	function injectStyles() {
		if (document.getElementById(ID + "-css")) return;
		const css = `
        #${ID} {
            display: flex;
            flex-direction: column;
            align-items: center;
            align-self: stretch;
            flex: 1 1 auto;
            gap: ${CONFIG.GAP}px;
            margin-top: ${CONFIG.TOP_MARGIN}px;
            border-top: ${CONFIG.TOP_BORDER};
            padding-top: ${CONFIG.TOP_PADDING}px;
            color: #444746;
        }
        #${ID}.mk-floating {
            position: fixed;
            left: ${CONFIG.FALLBACK_LEFT}px;
            top: ${CONFIG.FALLBACK_TOP}px;
            width: ${CONFIG.FALLBACK_WIDTH}px;
            z-index: 900;
        }
        #${ID} .mk-btn {
            position: relative;
            width: ${CONFIG.BUTTON_SIZE}px;
            height: ${CONFIG.BUTTON_SIZE}px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 0;
            padding: 0;
            border-radius: 50%;
            background: transparent;
            color: inherit;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
        }
        #${ID} .mk-btn:hover { background: rgba(68,71,70,.08); }
        #${ID} .mk-btn:focus-visible { outline: 2px solid #0b57d0; outline-offset: 2px; }
        #${ID} .mk-btn[aria-current="page"] { background: #d3e3fd; color: #041e49; }
        #${ID} .mk-btn svg { width: ${CONFIG.ICON_SIZE}px; height: ${CONFIG.ICON_SIZE}px; fill: currentColor; }
        #${ID} .mk-compose { background: #c2e7ff; color: #001d35; }
        #${ID} .mk-compose:hover { background: #b0dcff; }
        #${ID} .mk-badge {
            position: absolute;
            top: 1px; right: 0;
            min-width: 8px;
            padding: 0 4px;
            border-radius: 8px;
            background: #b3261e;
            color: #fff;
            font: 500 10px/14px Roboto, Arial, sans-serif;
            text-align: center;
        }
        #${ID} .mk-sep {
            width: 24px; height: 1px;
            margin: 4px 0;
            background: rgba(68,71,70,.2);
        }
        #${ID} .mk-foot {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding-bottom: 8px;
        }
        #${ID} .mk-foot.mk-pinned { margin-top: auto; }
 
        /* --- picker --- */
        #${PICKER_ID} {
            position: fixed;
            inset: 0;
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,.4);
            font: 400 14px/1.4 Roboto, Arial, sans-serif;
        }
        #${PICKER_ID} .mk-card {
            width: ${CONFIG.CARD_WIDTH}px;
            max-height: 70vh;
            display: flex;
            flex-direction: column;
            background: #fff;
            color: #1f1f1f;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,.3);
            overflow: hidden;
        }
        #${PICKER_ID} h2 { margin: 0; padding: 16px 20px 8px; font-size: 16px; font-weight: 500; }
        #${PICKER_ID} .mk-ver { margin-left: 6px; font-size: 11px; font-weight: 400; color: #80868b; }
        #${PICKER_ID} .mk-hint { padding: 0 20px 8px; margin: 0; font-size: 12px; color: #5f6368; }
        #${PICKER_ID} .mk-link a { color: #0b57d0; }
        #${PICKER_ID} .mk-subhead {
            margin: 0;
            padding: 12px 20px 4px;
            font-size: 11px;
            font-weight: 500;
            letter-spacing: .06em;
            text-transform: uppercase;
            color: #5f6368;
        }
        #${PICKER_ID} .mk-body {
            display: flex;
            flex-direction: column;
            flex: 1 1 auto;
            min-height: 0;
            overflow: hidden;
        }
        #${PICKER_ID} .mk-col {
            display: flex;
            flex-direction: column;
            min-height: 0;
        }
        #${PICKER_ID} .mk-opts { padding: 0 12px 4px; }
        #${PICKER_ID} .mk-list {
            overflow-y: auto;
            padding: 4px 12px;
            border-top: 1px solid rgba(68,71,70,.2);
        }
        #${PICKER_ID} label {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 7px 8px;
            border-radius: 6px;
            cursor: pointer;
        }
        #${PICKER_ID} label:hover { background: rgba(68,71,70,.08); }
        #${PICKER_ID} .mk-actions {
            display: flex;
            gap: 8px;
            padding: 12px 16px;
            border-top: 1px solid rgba(68,71,70,.2);
        }
        #${PICKER_ID} .mk-spacer { flex: 1; }
        #${PICKER_ID} button {
            padding: 8px 16px;
            border: 0;
            border-radius: 18px;
            background: transparent;
            color: #0b57d0;
            font: 500 14px Roboto, Arial, sans-serif;
            cursor: pointer;
        }
        #${PICKER_ID} button:hover { background: rgba(11,87,208,.08); }
        #${PICKER_ID} button[disabled] { opacity: .4; cursor: default; }
        #${PICKER_ID} button[disabled]:hover { background: transparent; }
        #${PICKER_ID} .mk-primary { background: #0b57d0; color: #fff; }
        #${PICKER_ID} .mk-primary:hover { background: #0a4bb8; }
 
        /* Two columns once there's room: options left, labels right. */
        @media (min-width: ${CONFIG.WIDE_BREAKPOINT}px) {
            #${PICKER_ID} .mk-card { width: ${CONFIG.CARD_WIDTH_WIDE}px; max-height: 76vh; }
            #${PICKER_ID} .mk-body { flex-direction: row; align-items: stretch; }
            #${PICKER_ID} .mk-col-opts {
                flex: 0 0 300px;
                border-right: 1px solid rgba(68,71,70,.2);
            }
            #${PICKER_ID} .mk-col-labels { flex: 1 1 auto; min-width: 0; }
            #${PICKER_ID} .mk-body .mk-list { border-top: 0; }
            #${PICKER_ID} .mk-body .mk-subhead { padding-top: 16px; }
        }
 
        @media (prefers-color-scheme: dark) {
            #${ID} { color: #c4c7c5; }
            #${ID} .mk-btn:hover { background: rgba(255,255,255,.08); }
            #${ID} .mk-btn[aria-current="page"] { background: #d3e4fd; }
            #${ID} .mk-sep { background: rgba(255,255,255,.2); }
            #${PICKER_ID} .mk-card { background: #1f1f1f; color: #e3e3e3; }
            #${PICKER_ID} .mk-hint { color: #9aa0a6; }
            #${PICKER_ID} .mk-subhead { color: #9aa0a6; }
            #${PICKER_ID} .mk-link a { color: #a8c7fa; }
            #${PICKER_ID} label:hover { background: rgba(255,255,255,.08); }
            #${PICKER_ID} button { color: #a8c7fa; }
            #${PICKER_ID} .mk-primary { background: #a8c7fa; color: #062e6f; }
            #${PICKER_ID} .mk-col-opts { border-right-color: rgba(255,255,255,.2); }
            #${PICKER_ID} .mk-list { border-top-color: rgba(255,255,255,.2); }
            #${PICKER_ID} .mk-actions { border-top-color: rgba(255,255,255,.2); }
        }`;
		const style = document.createElement("style");
		style.id = ID + "-css";
		style.textContent = css;
		document.head.appendChild(style);
	}
 
	// Trusted Types on mail.google.com blocks innerHTML, so every node here is
	// built explicitly. SVG needs createElementNS, not createElement.
	const SVG_NS = "http://www.w3.org/2000/svg";
	const PENCIL_PATH =
		"M192-192h51l393-393-51-51-393 393v51Zm-72 72v-153l520-518q11-11 25.5-17t30.5-6q16 0 30 6t25 18l55 55q12 11 17.5 25t5.5 28q0 16-5.5 30.5T807-647L289-120H120Z";
 
	function makePencil() {
		const svg = document.createElementNS(SVG_NS, "svg");
		svg.setAttribute("viewBox", "0 -960 960 960");
		svg.setAttribute("focusable", "false");
		svg.setAttribute("aria-hidden", "true");
		const path = document.createElementNS(SVG_NS, "path");
		path.setAttribute("d", PENCIL_PATH);
		svg.appendChild(path);
		return svg;
	}
 
	const COG_PATH =
		"M13.85 22.25h-3.7c-.74 0-1.36-.54-1.45-1.27l-.27-1.89c-.27-.14-.53-.29-.79-.46l-1.8.72c-.7.26-1.47-.03-1.81-.65L2.2 15.53c-.35-.66-.2-1.44.36-1.88l1.53-1.19c-.01-.15-.02-.3-.02-.46 0-.15.01-.31.02-.46l-1.52-1.19c-.59-.45-.74-1.26-.37-1.88l1.85-3.19c.34-.62 1.11-.9 1.79-.63l1.81.73c.26-.17.52-.32.78-.46l.27-1.91c.09-.7.71-1.25 1.44-1.25h3.7c.74 0 1.36.54 1.45 1.27l.27 1.89c.27.14.53.29.79.46l1.8-.72c.71-.26 1.48.03 1.82.65l1.84 3.18c.36.66.2 1.44-.36 1.88l-1.52 1.19c.01.15.02.3.02.46s-.01.31-.02.46l1.52 1.19c.56.45.72 1.23.37 1.86l-1.86 3.22c-.34.62-1.11.9-1.8.63l-1.8-.72c-.26.17-.52.32-.78.46l-.27 1.91c-.1.68-.72 1.22-1.46 1.22zm-3.23-2h2.76l.37-2.55.53-.22c.44-.18.88-.44 1.34-.78l.45-.34 2.38.96 1.38-2.4-2.03-1.58.07-.56c.03-.26.06-.51.06-.78s-.03-.53-.06-.78l-.07-.56 2.03-1.58-1.39-2.4-2.39.96-.45-.35c-.42-.32-.87-.58-1.33-.77l-.52-.22-.37-2.55h-2.76l-.37 2.55-.53.21c-.44.19-.88.44-1.34.79l-.45.33-2.38-.95-1.39 2.39 2.03 1.58-.07.56a7 7 0 0 0-.06.79c0 .26.02.53.06.78l.07.56-2.03 1.58 1.38 2.4 2.39-.96.45.35c.43.33.86.58 1.33.77l.53.22.38 2.55z";
 
	function makeCog() {
		const svg = document.createElementNS(SVG_NS, "svg");
		svg.setAttribute("viewBox", "0 0 24 24");
		svg.setAttribute("focusable", "false");
		svg.setAttribute("aria-hidden", "true");
		const path = document.createElementNS(SVG_NS, "path");
		path.setAttribute("d", COG_PATH);
		const circle = document.createElementNS(SVG_NS, "circle");
		circle.setAttribute("cx", "12");
		circle.setAttribute("cy", "12");
		circle.setAttribute("r", "3.5");
		svg.append(path, circle);
		return svg;
	}
 
	/* ------------------------------------------------------------------ *
	 * Picker — every change applies and saves immediately, so there is no
	 * Save button. "Revert" restores the snapshot taken when it opened.
	 * ------------------------------------------------------------------ */
	function openPicker() {
		injectStyles();
		document.getElementById(PICKER_ID)?.remove();
 
		const all = readAllItems();
		if (!all.length) {
			alert("No labels found yet — open Gmail fully, then try again.");
			return;
		}
 
		// Snapshot for Revert.
		const hidden0 = new Set(hidden);
		const opts0 = { ...opts };
 
		const overlay = document.createElement("div");
		overlay.id = PICKER_ID;
 
		const card = document.createElement("div");
		card.className = "mk-card";
 
		const title = document.createElement("h2");
		title.textContent = "Gmail Rail Icons";
		if (typeof GM_info !== "undefined") {
			const ver = document.createElement("span");
			ver.className = "mk-ver";
			ver.textContent = "v" + GM_info.script.version;
			title.appendChild(ver);
		}
		card.appendChild(title);
 
		const hint = document.createElement("p");
		hint.className = "mk-hint";
		hint.textContent =
			"Gmail Rail Icons is a userscript that mirrors the Compose button and label icons into Gmail's narrow left rail so a collapsed sidebar stays usable on a portrait monitor. Please pick which labels you want to appear. Checked labels appear in the rail. New labels are shown automatically.";
		card.appendChild(hint);
 
		if (CONFIG.REPO_URL) {
			const linkWrap = document.createElement("p");
			linkWrap.className = "mk-hint mk-link";
			const link = document.createElement("a");
			link.href = CONFIG.REPO_URL;
			link.target = "_blank";
			link.rel = "noopener noreferrer";
			link.textContent = "View on GitHub";
			linkWrap.appendChild(link);
			card.appendChild(linkWrap);
		}
 
		const body = document.createElement("div");
		body.className = "mk-body";
 
		/* --- options column --- */
		const optCol = document.createElement("div");
		optCol.className = "mk-col mk-col-opts";
 
		const optHead = document.createElement("h3");
		optHead.className = "mk-subhead";
		optHead.textContent = "Options";
		optCol.appendChild(optHead);
 
		const optList = document.createElement("div");
		optList.className = "mk-opts";
		const optBoxes = new Map();
 
		for (const def of OPTION_DEFS) {
			const label = document.createElement("label");
			const cb = document.createElement("input");
			cb.type = "checkbox";
			cb.checked = opt(def.key);
			const text = document.createElement("span");
			text.textContent = def.label;
			label.append(cb, text);
			optList.appendChild(label);
			optBoxes.set(def.key, cb);
 
			cb.addEventListener("change", () => {
				opts = { ...opts, [def.key]: cb.checked };
				saveOpts(opts);
				applyNow();
				syncDependents();
				// Hiding the cog leaves the manager menu as the only way back.
				if (def.key === "SHOW_SETTINGS" && !cb.checked) {
					alert('With the cog hidden, use "Choose labels" in your userscript manager menu to reopen this dialog.');
				}
			});
		}
		optCol.appendChild(optList);
		body.appendChild(optCol);
 
		/* --- labels column --- */
		const listCol = document.createElement("div");
		listCol.className = "mk-col mk-col-labels";
 
		const listHead = document.createElement("h3");
		listHead.className = "mk-subhead";
		listHead.textContent = "Labels";
		listCol.appendChild(listHead);
 
		const list = document.createElement("div");
		list.className = "mk-list";
		const boxes = new Map();
 
		for (const item of all) {
			const label = document.createElement("label");
			const cb = document.createElement("input");
			cb.type = "checkbox";
			cb.checked = !hidden.has(item.id);
			const text = document.createElement("span");
			text.textContent = item.name;
			label.append(cb, text);
			list.appendChild(label);
			boxes.set(item.id, cb);
 
			cb.addEventListener("change", () => commitLabels());
		}
		listCol.appendChild(list);
		body.appendChild(listCol);
		card.appendChild(body);
 
		/* --- live apply --- */
		function applyNow() {
			lastSig = ""; // force a rebuild even if the item list is unchanged
			safeRender();
		}
 
		// Rebuild the hidden set from the checkboxes, keeping ids that aren't
		// on screen right now (a collapsed label group, say) so they aren't
		// silently un-hidden.
		function commitLabels() {
			const shown = new Set(all.map((i) => i.id));
			const next = new Set([...hidden].filter((id) => !shown.has(id)));
			boxes.forEach((cb, id) => {
				if (!cb.checked) next.add(id);
			});
			hidden = next;
			saveHidden(hidden);
			applyNow();
		}
 
		// "Pin to the bottom" is meaningless with the cog switched off.
		function syncDependents() {
			const cog = optBoxes.get("SHOW_SETTINGS");
			const pin = optBoxes.get("SETTINGS_AT_BOTTOM");
			if (cog && pin) pin.disabled = !cog.checked;
		}
		syncDependents();
 
		/* --- actions --- */
		const actions = document.createElement("div");
		actions.className = "mk-actions";
 
		const all_ = document.createElement("button");
		all_.type = "button";
		all_.textContent = "All";
		all_.title = "Check every label";
		all_.addEventListener("click", () => {
			boxes.forEach((cb) => {
				cb.checked = true;
			});
			commitLabels();
		});
 
		const none = document.createElement("button");
		none.type = "button";
		none.textContent = "None";
		none.title = "Uncheck every label";
		none.addEventListener("click", () => {
			boxes.forEach((cb) => {
				cb.checked = false;
			});
			commitLabels();
		});
 
		const spacer = document.createElement("div");
		spacer.className = "mk-spacer";
 
		const revert = document.createElement("button");
		revert.type = "button";
		revert.textContent = "Revert";
		revert.title = "Undo every change made since this dialog was opened";
		revert.addEventListener("click", () => {
			hidden = new Set(hidden0);
			opts = { ...opts0 };
			saveHidden(hidden);
			saveOpts(opts);
			boxes.forEach((cb, id) => {
				cb.checked = !hidden.has(id);
			});
			optBoxes.forEach((cb, key) => {
				cb.checked = opt(key);
			});
			syncDependents();
			applyNow();
		});
 
		const done = document.createElement("button");
		done.type = "button";
		done.className = "mk-primary";
		done.textContent = "Done";
		done.addEventListener("click", close);
 
		actions.append(all_, none, spacer, revert, done);
		card.appendChild(actions);
		overlay.appendChild(card);
 
		function close() {
			overlay.remove();
			document.removeEventListener("keydown", onKey);
		}
		function onKey(e) {
			if (e.key === "Escape") close();
		}
 
		overlay.addEventListener("click", (e) => {
			if (e.target === overlay) close();
		});
		document.addEventListener("keydown", onKey);
		document.body.appendChild(overlay);
	}
 
	/* ------------------------------------------------------------------ *
	 * Rendering
	 * ------------------------------------------------------------------ */
	function makeButton({ label, iconNode, badge, extraClass, onClick, active }) {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "mk-btn" + (extraClass ? " " + extraClass : "");
		btn.setAttribute("aria-label", label);
		if (CONFIG.SHOW_TOOLTIPS) btn.title = label;
		if (active) btn.setAttribute("aria-current", "page");
 
		if (iconNode) {
			btn.appendChild(iconNode);
		} else {
			const fallback = document.createElement("span");
			fallback.textContent = (label[0] || "?").toUpperCase();
			fallback.style.font = "500 14px Roboto, Arial, sans-serif";
			btn.appendChild(fallback);
		}
 
		if (badge) {
			const b = document.createElement("span");
			b.className = "mk-badge";
			b.textContent = badge;
			btn.appendChild(b);
		}
		btn.addEventListener("click", (e) => {
			e.preventDefault();
			onClick();
		});
		return btn;
	}
 
	function currentHash() {
		return (location.hash.replace(/^#/, "").split("/")[0] || "inbox").toLowerCase();
	}
 
	function signature(items) {
		return [currentHash(), ...items.map((i) => `${i.id}:${i.unread || ""}`)].join("|");
	}
 
	let lastSig = "";
 
	function render() {
		injectStyles();
 
		const items = readItems();
		log(
			"render: nav =",
			!!getNav(),
			"| compose =",
			!!getComposeButton(),
			"| rows =",
			getLabelRows().length,
			"| shown =",
			items.length,
			"| hidden =",
			hidden.size,
		);
 
		if (!items.length && !opt("SHOW_COMPOSE")) return;
 
		const sig = signature(items);
		const host = findRailHost();
		const existing = document.getElementById(ID);
		if (existing && sig === lastSig && existing.parentElement === (host || document.body)) return;
		lastSig = sig;
 
		const rail = document.createElement("div");
		rail.id = ID;
		if (!host) {
			rail.classList.add("mk-floating");
			if (CONFIG.DEBUG) rail.style.outline = "1px dashed red";
		}
 
		if (opt("SHOW_COMPOSE")) {
			rail.appendChild(
				makeButton({
					label: "Compose",
					iconNode: makePencil(),
					extraClass: "mk-compose",
					onClick: () => forceClick(getComposeButton()),
				}),
			);
			if (items.length) {
				const sep = document.createElement("div");
				sep.className = "mk-sep";
				rail.appendChild(sep);
			}
		}
 
		const active = currentHash();
		for (const item of items) {
			rail.appendChild(
				makeButton({
					label: item.unread ? `${item.name} (${item.unread} unread)` : item.name,
					iconNode: item.icon ? item.icon.cloneNode(true) : null,
					badge: opt("SHOW_BADGES") ? item.unread : null,
					active: CONFIG.HIGHLIGHT_ACTIVE && item.hash === active,
					onClick: () => {
						location.href = item.href;
					},
				}),
			);
		}
 
		if (opt("SHOW_SETTINGS")) {
			const foot = document.createElement("div");
			foot.className = "mk-foot" + (opt("SETTINGS_AT_BOTTOM") ? " mk-pinned" : "");
			if (!opt("SETTINGS_AT_BOTTOM") && (items.length || opt("SHOW_COMPOSE"))) {
				const sep = document.createElement("div");
				sep.className = "mk-sep";
				foot.appendChild(sep);
			}
			foot.appendChild(
				makeButton({
					label: "Choose labels",
					iconNode: makeCog(),
					extraClass: "mk-settings",
					onClick: openPicker,
				}),
			);
			rail.appendChild(foot);
		}
 
		if (existing) existing.remove();
		(host || document.body).appendChild(rail);
		stretchRail();
		log("rendered", items.length, "items into", host ? "rail" : "floating fallback");
	}
 
	// `margin-top: auto` only pushes the cog down if the rail actually fills
	// the strip. That works for free when the strip is a flex column; when it
	// isn't, flex:1 is inert and we have to set a height ourselves.
	function stretchRail() {
		if (!opt("SETTINGS_AT_BOTTOM") || !opt("SHOW_SETTINGS")) return;
		const rail = document.getElementById(ID);
		const host = rail && rail.parentElement;
		if (!rail || !host || host === document.body) return;
 
		if (getComputedStyle(host).display.includes("flex")) {
			rail.style.minHeight = "";
			return;
		}
		const avail = host.getBoundingClientRect().bottom - rail.getBoundingClientRect().top;
		if (avail > 0) rail.style.minHeight = Math.floor(avail) + "px";
	}
 
	/* ------------------------------------------------------------------ *
	 * Boot
	 * ------------------------------------------------------------------ */
	// Any throw in here used to kill the interval and the observer callback
	// silently, which looks exactly like "the script never ran".
	function safeRender() {
		try {
			render();
		} catch (e) {
			console.error("[rail] render failed:", e);
		}
	}
 
	// Open the picker once, and only once we can actually read labels — Gmail
	// fills the sidebar late, so an early attempt would show an empty list and
	// burn the one-time flag on nothing.
	function maybeFirstRun(attempt = 0) {
		if (!CONFIG.SHOW_PICKER_ON_FIRST_RUN || loadFlag(SEEN_KEY)) return;
		if (!readAllItems().length) {
			if (attempt < 20) setTimeout(() => maybeFirstRun(attempt + 1), 500);
			return;
		}
		saveFlag(SEEN_KEY);
		openPicker();
	}
 
	const schedule = debounce(safeRender, 200);
 
	function start() {
		log("script loaded, waiting for Gmail nav…");
		const nav = getNav();
		if (!nav) {
			setTimeout(start, 500);
			return;
		}
		log("nav found", nav);
 
		if (typeof GM_registerMenuCommand === "function") {
			GM_registerMenuCommand("Choose labels", openPicker);
		}
		window.mkRail = {
			render: safeRender,
			openPicker,
			getNav,
			getStrip,
			getLabelRoot,
			getLabelRows,
			getComposeButton,
			readAllItems,
			findRailHost,
			getHidden: () => [...hidden],
			getOpts: () => ({ ...opts }),
			resetOpts: () => {
				opts = {};
				saveOpts(opts);
				lastSig = "";
				safeRender();
			},
			resetHidden: () => {
				hidden = new Set();
				saveHidden(hidden);
				lastSig = "";
				safeRender();
			},
			resetFirstRun: () => {
				if (hasGM) GM_setValue(SEEN_KEY, "");
				else localStorage.removeItem(SEEN_KEY);
			},
			CONFIG,
		};
 
		maybeFirstRun();
		safeRender();
		new MutationObserver(schedule).observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["aria-label", "style", "class", "data-tooltip"],
		});
		window.addEventListener("hashchange", schedule);
		window.addEventListener("resize", schedule);
		window.addEventListener("resize", debounce(stretchRail, 200));
		setInterval(safeRender, CONFIG.POLL_MS);
	}
 
	start();
})();
