/*
 * Capi Project Original (2026)
 * Jhezdev (github.com/Jhezdev)
 * Licensed Under GPL-3.0 | see git history for contributors
 */

package com.jhezdev.capi.innertube.models.response

import kotlinx.serialization.Serializable

@Serializable
data class CreatePlaylistResponse(
    val playlistId: String
)
