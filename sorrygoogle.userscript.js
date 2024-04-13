// ==UserScript==
// @name         Sorry, Google!
// @namespace    https://github.com/appel/userscripts
// @version      0.3
// @description  Offer link to take search to DuckDuckGo on the "/sorry" captcha pages Google serves when you use a VPN.
// @author       Ap
// @match        https://www.google.com/sorry/*
// @grant        none
// @license      MIT
// ==/UserScript==
 
(function () {
    'use strict';
 
    const extractQuery = (url) => {
        const match = url.match(/q%3D(.*?)%26|q%3D(.*?)(?=&|$)/);
        if (match) {
            const queryComponent = match[1] || match[2];
            return decodeURIComponent(queryComponent.replace(/\+/g, ' '));
        }
        return '';
    };
 
    if (window.location.href.startsWith('https://www.google.com/sorry')) {
        const query = extractQuery(window.location.href);
        const ddgUrl = `https://duckduckgo.com/?q=${query}`;
        const link = document.createElement('a');
        link.href = ddgUrl;
        link.textContent = 'Nah fam, take search to DuckDuckGo';
        link.style.display = 'inline-block';
        link.style.marginTop = '1rem';
        link.style.padding = '0.5rem 1rem';
        link.style.backgroundColor = '#c7643b';
        link.style.color = '#ffffff';
        link.style.borderRadius = '5px';
        link.style.textDecoration = 'none';
        link.style.fontFamily = '-apple-system, BlinkMacSystemFont, avenir next, avenir, segoe ui, helvetica neue, helvetica, Cantarell, Ubuntu, roboto, noto, arial, sans-serif';
        link.style.fontSize = '18px';
        document.body.appendChild(link);
    }
})();
