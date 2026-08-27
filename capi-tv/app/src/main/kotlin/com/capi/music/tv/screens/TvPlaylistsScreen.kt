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
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.capi.music.LocalDatabase
import com.capi.music.R
import com.capi.music.constants.PlaylistSortType
import com.capi.music.db.MusicDatabase
import com.capi.music.db.entities.Playlist
import com.capi.music.tv.components.TvButton
import com.capi.music.tv.components.TvCard
import com.capi.music.tv.components.TvCreatePlaylistDialog
import com.capi.music.tv.components.TvSectionRow
import com.capi.music.tv.components.tvFocusable
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn

class TvPlaylistsViewModel(private val database: MusicDatabase) : ViewModel() {
    val playlists: StateFlow<List<Playlist>> =
        database.playlists(PlaylistSortType.CREATE_DATE, true)
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
}

@Composable
fun TvPlaylistsScreen(
    onOpenPlaylist: (String) -> Unit,
    onBack: () -> Unit,
) {
    val database = LocalDatabase.current
    val viewModel = remember { TvPlaylistsViewModel(database) }
    val playlists by viewModel.playlists.collectAsState()
    var showCreatePlaylist by remember { mutableStateOf(false) }

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
            text = stringResource(R.string.tv_playlists),
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

        TvSectionRow(
            title = "",
            items = playlists,
            placeholderCount = 4,
            key = { it.id },
        ) { playlist ->
            TvCard(
                thumbnailUrl = playlist.songThumbnails.firstOrNull(),
                title = playlist.title,
                subtitle = stringResource(R.string.tv_items, playlist.songCount),
                onClick = { onOpenPlaylist(playlist.id) },
            )
        }
    }

    if (showCreatePlaylist) {
        TvCreatePlaylistDialog(onDismiss = { showCreatePlaylist = false })
    }
}