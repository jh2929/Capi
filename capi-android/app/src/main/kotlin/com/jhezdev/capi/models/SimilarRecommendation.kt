/*
 * Capi Project Original (2026)
 * Jhezdev (github.com/Jhezdev)
 * Licensed Under GPL-3.0 | see git history for contributors
 */



package com.jhezdev.capi.models

import com.jhezdev.capi.innertube.models.YTItem
import com.jhezdev.capi.db.entities.LocalItem

data class SimilarRecommendation(
    val title: LocalItem,
    val items: List<YTItem>,
)
