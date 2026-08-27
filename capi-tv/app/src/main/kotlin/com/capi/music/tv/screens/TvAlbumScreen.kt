package com.capi.music.tv.screens

import com.capi.music.tv.components.TvTextPrimary
import com.capi.music.tv.components.TvTextSecondary

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.QueueMusic
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.SavedStateHandle
import com.capi.music.LocalDatabase
import com.capi.music.LocalPlayerConnection
import com.capi.music.R
import com.capi.music.db.MusicDatabase
import com.capi.music.db.entities.Song
import com.capi.music.extensions.toMediaItem
import com.capi.music.playback.PlayerConnection
import com.capi.music.playback.queues.ListQueue
import com.capi.music.tv.components.TvButton
import com.capi.music.tv.components.TvEmptyState
import com.capi.music.tv.components.TvSongActionsDialog
import com.capi.music.tv.components.TvThumbnail
import com.capi.music.tv.components.formatSeconds
import com.capi.music.tv.components.tvFocusable
import com.capi.music.viewmodels.AlbumUiState
import com.capi.music.viewmodels.AlbumViewModel

@Composable
fun TvAlbumScreen(
    albumId: String,
    onBack: () -> Unit,
    onOpenArtist: (String) -> Unit,
) {
    val database = LocalDatabase.current
    val viewModel =
        remember(albumId) {
            AlbumViewModel(database, SavedStateHandle(mapOf("albumId" to albumId)))
        }
    val albumWithSongs by viewModel.albumWithSongs.collectAsState()
    val playerConnection = LocalPlayerConnection.current
    val state = viewModel.uiState.collectAsState().value
    var menuSong by remember { mutableStateOf<Song?>(null) }

    Column(
        modifier =
            Modifier
                .fillMaxSize()
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

        val album = albumWithSongs?.album
        val songs = albumWithSongs?.songs.orEmpty()
        if (album != null) {
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(26.dp),
                ) {
                    TvThumbnail(
                        url = album.thumbnailUrl,
                        shape = MaterialTheme.shapes.extraLarge,
                        modifier = Modifier.width(240.dp).aspectRatio(1f),
                    )
                    Column(Modifier.weight(1f)) {
                        Text(
                            text = album.title,
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = TvTextPrimary,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                        album.year?.let {
                            Text(
                                text = it.toString(),
                                style = MaterialTheme.typography.bodyMedium,
                                color = TvTextSecondary,
                            )
                        }
                        Spacer(Modifier.height(18.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                            TvButton(
                                label = stringResource(R.string.tv_play),
                                filled = true,
                                onClick = { playAlbum(playerConnection, album.title, songs, 0) },
                            )
                            TvButton(
                                label = stringResource(R.string.tv_shuffle),
                                onClick = {
                                    playerConnection?.player?.shuffleModeEnabled = true
                                    playerConnection?.playQueue(
                                        ListQueue(
                                            title = album.title,
                                            items = songs.map { it.toMediaItem() },
                                            startIndex = 0,
                                        ),
                                    )
                                },
                            )
                        }
                    }
                }
                Spacer(Modifier.height(24.dp))
                songs.forEachIndexed { index, song ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier =
                            Modifier
                                .fillMaxWidth()
                                .padding(bottom = 10.dp)
                                .clip(MaterialTheme.shapes.medium)
                                .background(Color(0xFF17171E))
                                .tvFocusable(
                                    shape = MaterialTheme.shapes.medium,
                                    ringWidth = 2.dp,
                                    onClick = { playAlbum(playerConnection, album.title, songs, index) },
                                    onLongClick = { menuSong = song },
                                )
                                .padding(horizontal = 18.dp, vertical = 12.dp),
                    ) {
                        Text(
                            text = (index + 1).toString(),
                            style = MaterialTheme.typography.titleMedium,
                            color = TvTextSecondary,
                            modifier = Modifier.width(36.dp),
                        )
                        Column(Modifier.weight(1f)) {
                            Text(
                                text = song.title,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Medium,
                                color = TvTextPrimary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Text(
                                text = song.artists.joinToString(", ") { it.name },
                                style = MaterialTheme.typography.bodyMedium,
                                color = TvTextSecondary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                        Text(
                            text = formatSeconds(song.song.duration),
                            style = MaterialTheme.typography.bodyMedium,
                            color = TvTextSecondary,
                        )
                    }
                }
            }

            menuSong?.let { song ->
                val songIndex = songs.indexOfFirst { it.id == song.id }.coerceAtLeast(0)
                TvSongActionsDialog(
                    title = song.title,
                    songId = song.id,
                    onPlayNow = { playAlbum(playerConnection, album.title, songs, songIndex) },
                    onPlayNext = { playerConnection?.playNext(song.toMediaItem()) },
                    onAddToQueue = { playerConnection?.addToQueue(song.toMediaItem()) },
                    onDismiss = { menuSong = null },
                )
            }
        } else {
            when (state) {
                is AlbumUiState.Loading -> TvEmptyState(stringResource(R.string.tv_loading))
                is AlbumUiState.Empty -> TvEmptyState(stringResource(R.string.tv_no_songs))
                is AlbumUiState.Error ->
                    TvEmptyState(
                        title = stringResource(R.string.tv_error),
                        subtitle =
                            if (state.isNotFound) stringResource(R.string.tv_album_not_found)
                            else null,
                    )

                is AlbumUiState.Content -> {}
            }
        }
    }
}

private fun playAlbum(
    playerConnection: PlayerConnection?,
    title: String,
    songs: List<Song>,
    startIndex: Int,
) {
    playerConnection?.playQueue(
        ListQueue(
            title = title,
            items = songs.map { it.toMediaItem() },
            startIndex = startIndex,
        ),
    )
}