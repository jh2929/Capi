package com.capi.music.tv.screens

import com.capi.music.tv.components.TvTextPrimary
import com.capi.music.tv.components.TvTextSecondary

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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.capi.music.R
import com.capi.music.innertube.YouTube
import com.capi.music.innertube.models.ArtistItem
import com.capi.music.tv.components.TvCard
import com.capi.music.tv.components.TvEmptyState
import com.capi.music.tv.components.TvSectionRow
import com.capi.music.tv.components.tvFocusable

@Composable
fun TvArtistsScreen(
    onOpenArtist: (String) -> Unit,
    onBack: () -> Unit,
) {
    var artists by remember { mutableStateOf<List<ArtistItem>?>(null) }

    LaunchedEffect(Unit) {
        val fromHome =
            YouTube.home()
                .getOrNull()
                ?.sections
                ?.flatMap { it.items }
                .orEmpty()
                .filterIsInstance<ArtistItem>()
        val list =
            if (fromHome.isNotEmpty()) {
                fromHome
            } else {
                YouTube.search("trending artists", YouTube.SearchFilter.FILTER_ARTIST)
                    .getOrNull()
                    ?.items
                    .orEmpty()
                    .filterIsInstance<ArtistItem>()
            }
        artists = list.distinctBy { it.id }
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
            text = stringResource(R.string.tv_artists),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = TvTextPrimary,
            modifier = Modifier.padding(start = 16.dp, bottom = 14.dp),
        )

        val items = artists
        if (items == null) {
            TvEmptyState(title = stringResource(R.string.tv_loading))
        } else if (items.isEmpty()) {
            TvEmptyState(title = stringResource(R.string.tv_error))
        } else {
            TvSectionRow(
                title = "",
                items = items,
                key = { it.id },
            ) { artist ->
                TvCard(
                    thumbnailUrl = artist.thumbnail,
                    title = artist.title,
                    subtitle = stringResource(R.string.tv_artist),
                    onClick = { onOpenArtist(artist.id) },
                )
            }
        }
    }
}