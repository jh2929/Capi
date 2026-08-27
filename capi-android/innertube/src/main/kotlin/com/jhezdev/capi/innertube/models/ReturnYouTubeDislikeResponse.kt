/*
 * Capi Project Original (2026)
 * Jhezdev (github.com/Jhezdev)
 * Licensed Under GPL-3.0 | see git history for contributors
 */

package com.jhezdev.capi.innertube.models

import kotlinx.serialization.Serializable

@Serializable
data class ReturnYouTubeDislikeResponse(
    val id: String? = null,
    val dateCreated: String? = null,
    val likes: Int? = null,
    val dislikes: Int? = null,
    val rating: Double? = null,
    val viewCount: Int? = null,
    val deleted: Boolean? = null,
)
