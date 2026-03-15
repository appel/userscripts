// ==UserScript==
// @name         Zillow PPSF
// @namespace    https://github.com/appel/userscripts
// @version      0.2
// @description  Calculates and shows price per sqft for Zillow listings in search results.
// @author       Ap
// @match        https://www.zillow.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=zillow.com
// @grant        none
// @license      MIT
// ==/UserScript==
 
(function () {
	'use strict';
 
	// Function to handle price conversion from formats like $1.25M or $200K
	function convertPrice(priceText) {
		let price = parseFloat(priceText.replace(/[^\d.-]/g, '')); // Remove non-numeric characters
		if (priceText.includes('M')) {
			price *= 1e6; // Convert million (M) to numeric value
		} else if (priceText.includes('K')) {
			price *= 1e3; // Convert thousand (K) to numeric value
		}
		return price;
	}
 
	// Function to calculate price per sqft for listings
	function calculatePricePerSqft() {
		// Select all list items that are part of the photo-cards
		const listItems = document.querySelectorAll('ul.photo-cards > li');
 
		// Loop through each item
		listItems.forEach((item) => {
			// Check if the price per sqft is already added to avoid duplication
			if (item.querySelector('.price-per-sqft')) {
				return; // Skip if already processed
			}
 
			// Use the data-test attribute for the price
			const priceElement = item.querySelector('[data-test="property-card-price"]');
 
			// Grab the unordered list containing the bed/bath/sqft details
			const detailsList = item.querySelectorAll('[data-testid="property-card-details"] li');
 
			let sqftElement = null;
			let sqftText = '';
			let isAcres = false;
 
			// Loop through the details to find the one that explicitly says 'sqft' or 'acre'
			for (let detail of detailsList) {
				const text = detail.textContent.toLowerCase();
				if (text.includes('sqft')) {
					sqftElement = detail;
					sqftText = detail.textContent;
					break;
				} else if (text.includes('acre')) {
					sqftElement = detail;
					sqftText = detail.textContent;
					isAcres = true;
					break;
				}
			}
 
			// Proceed only if both price and sqft/acreage exist
			if (priceElement && sqftElement) {
				// Extract price and clean sqft values
				const priceText = priceElement.textContent.trim();
				const cleanSqftText = sqftText.replace(/[^\d.-]/g, '');
 
				// Convert price and sqft values
				const price = convertPrice(priceText);
				let sqft = parseFloat(cleanSqftText);
 
				// Convert acres to sqft if necessary (1 acre = 43,560 sqft)
				if (isAcres && !isNaN(sqft)) {
					sqft = sqft * 43560;
				}
 
				// Proceed if we at least have a valid price
				if (!isNaN(price)) {
					let pricePerSqftText = '';
 
					// If we have a valid sqft, calculate it.
					if (!isNaN(sqft) && sqft > 0) {
						const pricePerSqft = Math.round(price / sqft);
						pricePerSqftText = `$${pricePerSqft}/sqft`;
					} else {
						pricePerSqftText = `sqft n/a`;
					}
 
					// Create the span element
					const pricePerSqftNode = document.createElement('span');
					pricePerSqftNode.textContent = pricePerSqftText;
					pricePerSqftNode.classList.add('price-per-sqft');
 
					// Apply styles directly to the span element
					pricePerSqftNode.style.color = '#5467f5';
					pricePerSqftNode.style.fontSize = '13px';
					pricePerSqftNode.style.fontWeight = 'bold';
					pricePerSqftNode.style.lineHeight = '1em';
 
					// Append right inside the price element
					priceElement.appendChild(pricePerSqftNode);
				}
			}
		});
	}
 
	// Run once immediately on load
	calculatePricePerSqft();
 
	// Set up a MutationObserver to listen for DOM changes (like scrolling or changing pages)
	let debounceTimer;
	const observer = new MutationObserver(() => {
		// Debounce: Wait 200ms after the last DOM change before running
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(calculatePricePerSqft, 200);
	});
 
	// Observe the entire document body since Zillow dynamically injects the property cards
	observer.observe(document.body, {
		childList: true,
		subtree: true
	});
})();
