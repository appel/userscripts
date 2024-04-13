// ==UserScript==
// @name         Ye Olde Lemmy
// @namespace    https://github.com/appel/userscripts
// @version      0.0.4
// @description  A handy toggle for a familiar desktop experience for lemmy. Quickly switch from {instance} to o.opnxng.com/{instance} and back
// @author       appel
// @match        *://*.lemmy.ml/*
// @match        *://*.lemmy.world/*
// @match        *://*.lemm.ee/*
// @match        *://*.sh.itjust.works/*
// @match        *://*.beehaw.org/*
// @match        *://lemmy.dbzer0.com/*
// @match        *://o.opnxng.com/*
// @grant        none
// @license      MIT
// ==/UserScript==
 
(function () {
    "use strict";
 
    // Check if the script is running in an iframe or not
    if (window.self !== window.top) {
        return; // Return if inside an iframe
    }
 
    // MutationObserver watches for changes in the document
    let observer = new MutationObserver(function () {
        if (document.querySelector(".toggle-switch")) {
            return;
        }
 
        const url = window.location.href;
        const domainMatch = url.match(/https?:\/\/([^\/]+)\//);
        const currentDomain = domainMatch ? domainMatch[1] : null;
        let btnColor, btnText, btnTitle, newUrl;
 
        if (currentDomain && currentDomain.includes('opnxng.com')) {
            const instance = url.match(/https:\/\/o.opnxng.com\/([^\/]+)\//)[1];
            btnColor = "#333";
            btnText = "L";
            btnTitle = "Back to Lemmy Instance";
            newUrl = `https://${instance}/`;
        } else if (currentDomain) {
            btnColor = "#ff6c60";
            btnText = "O";
            btnTitle = `Switch to o.opnxng.com/${currentDomain}`;
            newUrl = `https://o.opnxng.com/${currentDomain}/`;
        }
 
        if (!newUrl) {
            return;
        }
 
        // Create button
        let btn = document.createElement("button");
        btn.classList.add("toggle-switch");
        btn.textContent = btnText;
        btn.title = btnTitle;
        btn.style.position = "fixed";
        btn.style.top = "46px";
        btn.style.right = "10px";
        btn.style.zIndex = "9999";
        btn.style.backgroundColor = btnColor;
        btn.style.color = "white";
        btn.style.borderRadius = "50%";
        btn.style.width = "24px";
        btn.style.height = "24px";
        btn.style.border = "none";
        btn.style.cursor = "pointer";
        btn.style.fontFamily = "-apple-system, BlinkMacSystemFont, avenir next, avenir, segoe ui, helvetica neue, helvetica, Cantarell, Ubuntu, roboto, noto, arial, sans-serif";
        btn.style.fontSize = "14px";
        btn.style.fontWeight = "700";
        btn.style.textAlign = "center";
        btn.style.padding = "0";
        btn.style.lineHeight = "24px";
        btn.style.transition = "transform .15s ease";
 
        // Add button to page
        document.body.appendChild(btn);
 
        btn.addEventListener("click", function () {
            // Add "pop" animation
            this.style.transform = "scale(1.2)";
            setTimeout(() => (this.style.transform = "scale(1)"), 150);
 
            window.location.href = newUrl;
        });
    });
 
    observer.observe(document, { childList: true, subtree: true });
})();
