/*
 * Capi Project Original (2026)
 * Jhezdev (github.com/Jhezdev)
 * Licensed Under GPL-3.0 | see git history for contributors
 */

package com.jhezdev.capi.innertube.pages

import com.jhezdev.capi.innertube.models.YTItem

data class ArtistItemsContinuationPage(
    val items: List<YTItem>,
    val continuation: String?,
)
