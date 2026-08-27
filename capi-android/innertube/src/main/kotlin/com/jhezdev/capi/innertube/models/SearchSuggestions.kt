/*
 * Capi Project Original (2026)
 * Jhezdev (github.com/Jhezdev)
 * Licensed Under GPL-3.0 | see git history for contributors
 */

package com.jhezdev.capi.innertube.models

data class SearchSuggestions(
    val queries: List<String>,
    val recommendedItems: List<YTItem>,
)
