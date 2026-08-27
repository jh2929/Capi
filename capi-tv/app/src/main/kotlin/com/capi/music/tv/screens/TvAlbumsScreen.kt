package com.capi.music.tv.screens

import com.capi.music.tv.components.TvTextPrimary
import com.capi.music.tv.components.TvTextSecondary

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.capi.music.R
import com.capi.music.innertube.YouTube
import com.capi.music.innertube.models.AlbumItem
import com.capi.music.innertube.models.YTItem
import com.capi.music.tv.components.TvButton
import com.capi.music.tv.components.TvCard
import com.capi.music.tv.components.TvCreatePlaylistDialog
import com.capi.music.tv.components.TvEmptyState
import com.capi.music.tv.components.TvSectionRow
import com.capi.music.tv.components.tvFocusable

@Composable
fun TvAlbumsScreen(
    onOpenAlbum: (String) -> Unit,
    onBack: () -> Unit,
) {
    var albums by remember { mutableStateOf<List<AlbumItem>?>(null) }
    var showCreatePlaylist by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        val fromExplore =
            YouTube.explore()
                .getOrNull()
                ?.newReleaseAlbums
                .orEmpty()
        val list =
            if (fromExplore.isNotEmpty()) {
                fromExplore
            } else {
                YouTube.getChartsPage()
                    .getOrNull()
                    ?.sections
                    ?.flatMap { it.items }
                    .orEmpty()
                    .filterIsInstance<AlbumItem>()
            }
        albums = list.distinctBy { it.browseId }
    }

    Column(
        modifier =
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(start = 8.dp, top = 16.dp, end = 40.dp, bottom = 24.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(bottom = 10.dp),
        ) {
            Icon(
                imageVector = Icons.Rounded.ArrowBack,
                contentDescription = stringResource(R.string.tv_back),
                tint = TvTextPrimary,
                modifier =
                    Modifier
                        .tvFocusable(shape = MaterialTheme.shapes.large) { onBack() }
                        .padding(12.dp),
            )
            Text(
                text = stringResource(R.string.tv_back),
                style = MaterialTheme.typography.titleMedium,
                color = TvTextPrimary,
            )
        }

        Text(
            text = stringResource(R.string.tv_albums),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = TvTextPrimary,
            modifier = Modifier.padding(start = 16.dp, bottom = 14.dp),
        )

        Row(
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.padding(start = 16.dp, bottom = 8.dp),
        ) {
            TvButton(
                label = stringResource(R.string.tv_new_playlist),
                filled = true,
                onClick = { showCreatePlaylist = true },
            )
        }

        val items = albums
        if (items == null) {
            TvEmptyState(title = stringResource(R.string.tv_loading))
        } else if (items.isEmpty()) {
            TvEmptyState(title = stringResource(R.string.tv_error))
        } else {
            TvSectionRow(
                title = "",
                items = items,
                key = { it.browseId },
            ) { album ->
                TvCard(
                    thumbnailUrl = album.thumbnail,
                    title = album.title,
                    subtitle = album.artists?.joinToString(", ") { it.name },
                    onClick = { onOpenAlbum(album.browseId) },
                )
            }
        }
    }

    if (showCreatePlaylist) {
        TvCreatePlaylistDialog(onDismiss = { showCreatePlaylist = false })
    }
}