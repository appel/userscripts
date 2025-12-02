// ==UserScript==
// @name         Postmarks (Gmail Quick Links Port)
// @namespace    https://github.com/appel/userscripts
// @version      0.1
// @description  Postmarks is a userscript port of kevinwucodes/gmail-quick-links with a few QoL improvements. Adds Import/Export feature and Bootrap Icons.
// @author       Ap
// @match        https://mail.google.com/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_download
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const ICONS = {
        add: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus-lg" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2"/></svg>`,
        delete: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/></svg>`,
        edit: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil" viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325"/></svg>`,
        globe: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-globe" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m7.5-6.923c-.67.204-1.335.82-1.887 1.855A8 8 0 0 0 5.145 4H7.5zM4.09 4a9.3 9.3 0 0 1 .64-1.539 7 7 0 0 1 .597-.933A7.03 7.03 0 0 0 2.255 4zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a7 7 0 0 0-.656 2.5zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5zM8.5 5v2.5h2.99a12.5 12.5 0 0 0-.337-2.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5zM5.145 12q.208.58.468 1.068c.552 1.035 1.218 1.65 1.887 1.855V12zm.182 2.472a7 7 0 0 1-.597-.933A9.3 9.3 0 0 1 4.09 12H2.255a7 7 0 0 0 3.072 2.472M3.82 11a13.7 13.7 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5zm6.853 3.472A7 7 0 0 0 13.745 12H11.91a9.3 9.3 0 0 1-.64 1.539 7 7 0 0 1-.597.933M8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855q.26-.487.468-1.068zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.7 13.7 0 0 1-.312 2.5m2.802-3.5a7 7 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7 7 0 0 0-3.072-2.472c.218.284.418.598.597.933M10.855 4a8 8 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4z"/></svg>`,
        upload: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-upload" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/><path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z"/></svg>`,
        download: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-download" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/></svg>`
    };

    const css = `
        #postmarksContainer {
            padding: 0 0 2rem 0;
            font-family: "Google Sans",Roboto,RobotoDraft,Helvetica,Arial,sans-serif;
            color: #222;
        }
        #postmarksHeader {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 0 0 1rem;
        }
        #postmarksHeader h2 {
            font-size: 14px;
            margin: 0;
            color: #202124;
            font-weight: 500;
        }
        /* Action Button Group in Header */
        .pm-action-group {
            display: flex;
            align-items: center;
            gap: .25rem;
        }

        /* Header Buttons (Icon Only) */
        .pm-header-btn {
            cursor: pointer;
            color: #5f6368;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            border-radius: 4px;
        }
        .pm-header-btn:hover { color: #1a73e8; background-color: rgba(32,33,36,0.059); }
        .pm-header-btn svg { width: 14px; height: 14px; }

        .pm-list {padding-left: 20px;}
        .pm-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0;
        }
        .pm-item a {
            text-decoration: none;
            color: #333;
            flex-grow: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            cursor: pointer;
        }
        .pm-item a:hover { color: #000;}

        /* Icon Controls in List */
        .pm-controls { display: flex; align-items: center; gap: 4px; opacity: 0; transition: opacity 0.2s; }
        .pm-item:hover .pm-controls { opacity: 1; }

        .pm-icon-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            cursor: pointer;
            color: #5f6368;
            border-radius: 4px;
        }
        .pm-icon-btn:hover { background-color: rgba(95,99,104,0.1); color: #202124; }
        .pm-icon-btn svg { width: 12px; height: 12px; }

        /* Specific State Colors */
        .pm-is-global { color: #1a73e8 !important; } /* Blue for global */
        .pm-is-local { color: #dadce0 !important; } /* Light grey for local */
        .pm-is-local:hover { color: #5f6368 !important; }
    `;
    GM_addStyle(css);

    const STORAGE_KEY = 'postmarks_data';

    const getStore = () => GM_getValue(STORAGE_KEY, { linkList: {}, accountList: {} });
    const setStore = (data) => GM_setValue(STORAGE_KEY, data);

    const selectors = {
        labelControlsContainer: () => document.getElementsByClassName('ajl aib aZ6')[0],
        sidebar: () => document.querySelector('div.wT'),
        accountName: () => {
            try {
                const node = Array.from(document.querySelectorAll('a[aria-label]'))
                    .map(n => n.attributes['aria-label'].nodeValue)
                    .find(t => /\(.+@.+\)/.test(t));
                if (node) return node.match(/\((.+@.+)\)/)[1];
            } catch (e) { console.error("GQL: Could not find account name", e); }
            return "unknown_account";
        }
    };

    function getCurrentHash() { return window.location.hash; }

    function addLink() {
        const account = selectors.accountName();
        const urlHash = getCurrentHash();
        const name = prompt(`Enter title for current link [${urlHash.substring(1)}]`, urlHash.substring(1));

        if (!name) return;

        const data = getStore();
        if (!data.accountList) data.accountList = {};
        if (!data.accountList[account]) data.accountList[account] = {};

        data.accountList[account][name] = { urlHash };
        setStore(data);
        renderLinks();
    }

    function removeLink(type, name) {
        if (!confirm(`Delete link "${name}"?`)) return;
        const data = getStore();
        const account = selectors.accountName();

        if (type === 'global') delete data.linkList[name];
        else delete data.accountList[account][name];

        setStore(data);
        renderLinks();
    }

    function renameLink(type, oldName) {
        const newName = prompt(`Rename link "${oldName}"?`, oldName);
        if (!newName || newName === oldName) return;

        const data = getStore();
        const account = selectors.accountName();
        let sourceObj = (type === 'global') ? data.linkList : data.accountList[account];

        sourceObj[newName] = sourceObj[oldName];
        delete sourceObj[oldName];

        setStore(data);
        renderLinks();
    }

    function toggleGlobal(type, name) {
        const data = getStore();
        const account = selectors.accountName();

        if (type === 'global') {
            const item = data.linkList[name];
            delete data.linkList[name];
            if (!data.accountList[account]) data.accountList[account] = {};
            data.accountList[account][name] = item;
        } else {
            const item = data.accountList[account][name];
            delete data.accountList[account][name];
            if (!data.linkList) data.linkList = {};
            data.linkList[name] = item;
        }

        setStore(data);
        renderLinks();
    }

    function handleExport() {
        const data = getStore();
        const jsonStr = JSON.stringify(data, null, 2);
        const fileName = `postmarks_${new Date().toISOString().slice(0, 10)}.json`;

        if (typeof GM_download !== 'undefined') {
            GM_download({
                url: 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr),
                name: fileName,
                saveAs: true
            });
        } else {
            alert("Error: GM_download is not supported by your userscript manager.");
        }
    }

    function handleImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsedData = JSON.parse(event.target.result);
                    if (!parsedData || (typeof parsedData.linkList === 'undefined' && typeof parsedData.accountList === 'undefined')) {
                        alert("Invalid backup file.");
                        return;
                    }
                    if (confirm("Importing will REPLACE all existing links. Continue?")) {
                        setStore(parsedData);
                        renderLinks();
                        alert("Import successful.");
                    }
                } catch (err) {
                    alert("Error parsing JSON file.");
                }
            };
            reader.readAsText(file);
        };
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }

    function createIconBtn(svgHtml, title, action, extraClass = '') {
        const btn = document.createElement('div');
        btn.className = `pm-icon-btn ${extraClass}`;
        btn.title = title;
        btn.innerHTML = svgHtml;
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            action();
        };
        return btn;
    }

    function createLinkRow(type, name, urlHash) {
        const div = document.createElement('div');
        div.className = 'pm-item';

        const a = document.createElement('a');
        a.href = urlHash;
        a.textContent = name;
        a.title = urlHash;

        const controls = document.createElement('div');
        controls.className = 'pm-controls';

        const globeClass = type === 'global' ? 'pm-is-global' : 'pm-is-local';
        const globeTitle = type === 'global' ? 'Make Local' : 'Make Global';

        controls.appendChild(createIconBtn(ICONS.globe, globeTitle, () => toggleGlobal(type, name), globeClass));
        controls.appendChild(createIconBtn(ICONS.edit, 'Rename', () => renameLink(type, name)));
        controls.appendChild(createIconBtn(ICONS.delete, 'Delete', () => removeLink(type, name)));

        div.appendChild(a);
        div.appendChild(controls);
        return div;
    }

    function renderLinks() {
        const container = document.getElementById('postmarksList');
        if (!container) return;

        container.innerHTML = '';
        const data = getStore();
        const account = selectors.accountName();

        if (data.linkList) {
            Object.keys(data.linkList).forEach(name => {
                container.appendChild(createLinkRow('global', name, data.linkList[name].urlHash));
            });
        }

        if (data.accountList && data.accountList[account]) {
            Object.keys(data.accountList[account]).forEach(name => {
                container.appendChild(createLinkRow('account', name, data.accountList[account][name].urlHash));
            });
        }

        if (container.children.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.padding = '5px';
            emptyMsg.style.fontSize = '12px';
            emptyMsg.style.color = '#777';
            emptyMsg.textContent = 'No links found.';
            container.appendChild(emptyMsg);
        }
    }

    function injectUI() {
        if (document.getElementById('postmarksContainer')) return;

        const targetNode = selectors.labelControlsContainer();
        if (!targetNode) return;

        const mainDiv = document.createElement('div');
        mainDiv.id = 'postmarksContainer';

        const header = document.createElement('div');
        header.id = 'postmarksHeader';

        const title = document.createElement('h2');
        title.textContent = "Postmarks";

        const actionGroup = document.createElement('div');
        actionGroup.className = 'pm-action-group';

        const createHeaderBtn = (icon, title, action) => {
            const s = document.createElement('div');
            s.className = 'pm-header-btn';
            s.title = title;
            s.innerHTML = icon;
            s.onclick = action;
            return s;
        };

        actionGroup.appendChild(createHeaderBtn(ICONS.upload, "Import JSON", handleImport));
        actionGroup.appendChild(createHeaderBtn(ICONS.download, "Export JSON", handleExport));
        actionGroup.appendChild(createHeaderBtn(ICONS.add, "Add Link", addLink));

        header.appendChild(title);
        header.appendChild(actionGroup);

        const listDiv = document.createElement('div');
        listDiv.id = 'postmarksList';
        listDiv.className = 'pm-list';

        mainDiv.appendChild(header);
        mainDiv.appendChild(listDiv);

        targetNode.insertAdjacentElement('beforebegin', mainDiv);
        renderLinks();
    }

    const init = setInterval(() => {
        if (selectors.sidebar() && selectors.labelControlsContainer()) {
            clearInterval(init);
            injectUI();

            const observer = new MutationObserver(() => {
                if (!document.getElementById('postmarksContainer')) {
                    injectUI();
                }
            });

            const parent = selectors.labelControlsContainer().parentElement;
            if (parent) observer.observe(parent, { childList: true, subtree: true });
        }
    }, 500);
})();
