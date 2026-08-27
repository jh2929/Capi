package com.capi.music.tv.screens

import com.capi.music.tv.components.TvTextPrimary
import com.capi.music.tv.components.TvTextSecondary

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
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
import com.capi.music.extensions.toMediaItem
import com.capi.music.innertube.models.SongItem
import com.capi.music.playback.PlayerConnection
import com.capi.music.playback.queues.ListQueue
import com.capi.music.tv.components.TvButton
import com.capi.music.tv.components.TvEmptyState
import com.capi.music.tv.components.TvSongActionsDialog
import com.capi.music.tv.components.TvThumbnail
import com.capi.music.tv.components.formatSeconds
import com.capi.music.tv.components.tvFocusable
import com.capi.music.viewmodels.OnlinePlaylistViewModel

@Composable
fun TvPlaylistScreen(
    playlistId: String,
    onBack: () -> Unit,
) {
    val database = LocalDatabase.current
    val viewModel =
        remember(playlistId) {
            OnlinePlaylistViewModel(SavedStateHandle(mapOf("playlistId" to playlistId)), database)
        }
    val playlist = viewModel.playlist.collectAsState().value
    val playlistSongs by viewModel.playlistSongs.collectAsState()
    val dbPlaylist by viewModel.dbPlaylist.collectAsState()
    val dbSongs by database.playlistSongs(playlistId).collectAsState(initial = emptyList())
    val playerConnection = LocalPlayerConnection.current
    var menuSong by remember { mutableStateOf<SongItem?>(null) }
    var menuDbSong by remember { mutableStateOf<com.capi.music.db.entities.Song?>(null) }

    val isLocalPlaylist = playlist == null && dbPlaylist != null
    val localSongs = dbSongs.map { it.song }

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

        if (playlist != null) {
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(26.dp),
                ) {
                    TvThumbnail(
                        url = playlist.thumbnail,
                        shape = MaterialTheme.shapes.extraLarge,
                        modifier =
                            Modifier
                                .width(240.dp)
                                .aspectRatio(1f),
                    )
                    Column(Modifier.weight(1f)) {
                        Text(
                            text = playlist.title,
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = TvTextPrimary,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                        playlist.author?.let {
                            Text(
                                text = it.name,
                                style = MaterialTheme.typography.titleMedium,
                                color = TvTextSecondary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                        Spacer(Modifier.height(18.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                            TvButton(
                                label = stringResource(R.string.tv_play),
                                filled = true,
                                onClick = { playPlaylist(playerConnection, playlist.title, playlistSongs, 0) },
                            )
                            TvButton(
                                label = stringResource(R.string.tv_shuffle),
                                onClick = {
                                    playerConnection?.player?.shuffleModeEnabled = true
                                    playPlaylist(playerConnection, playlist.title, playlistSongs, 0)
                                },
                            )
                        }
                    }
                }
                Spacer(Modifier.height(24.dp))
                playlistSongs.forEachIndexed { index, song ->
                    PlaylistSongRow(
                        index = index,
                        title = song.title,
                        artistsText = song.artists.joinToString(", ") { it.name },
                        duration = song.duration ?: 0,
                        onClick = { playPlaylist(playerConnection, playlist.title, playlistSongs, index) },
                        onLongClick = { menuSong = song },
                    )
                }
            }

            menuSong?.let { song ->
                val songIndex = playlistSongs.indexOfFirst { it.id == song.id }.coerceAtLeast(0)
                TvSongActionsDialog(
                    title = song.title,
                    songId = song.id,
                    onPlayNow = { playPlaylist(playerConnection, playlist.title, playlistSongs, songIndex) },
                    onPlayNext = { playerConnection?.playNext(song.toMediaItem()) },
                    onAddToQueue = { playerConnection?.addToQueue(song.toMediaItem()) },
                    onDismiss = { menuSong = null },
                )
            }
        } else if (isLocalPlaylist) {
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(26.dp),
                ) {
                    TvThumbnail(
                        url = dbPlaylist!!.thumbnails.firstOrNull(),
                        shape = MaterialTheme.shapes.extraLarge,
                        modifier =
                            Modifier
                                .width(240.dp)
                                .aspectRatio(1f),
                    )
                    Column(Modifier.weight(1f)) {
                        Text(
                            text = dbPlaylist!!.title,
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = TvTextPrimary,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Spacer(Modifier.height(18.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                            TvButton(
                                label = stringResource(R.string.tv_play),
                                filled = true,
                                onClick = { playLocalPlaylist(playerConnection, dbPlaylist!!.title, localSongs, 0) },
                            )
                            TvButton(
                                label = stringResource(R.string.tv_shuffle),
                                onClick = {
                                    playerConnection?.player?.shuffleModeEnabled = true
                                    playLocalPlaylist(playerConnection, dbPlaylist!!.title, localSongs, 0)
                                },
                            )
                        }
                    }
                }
                Spacer(Modifier.height(24.dp))
                if (localSongs.isEmpty()) {
                    TvEmptyState(
                        title = stringResource(R.string.tv_no_songs),
                    )
                }
                localSongs.forEachIndexed { index, song ->
                    PlaylistSongRow(
                        index = index,
                        title = song.title,
                        artistsText = song.artists.joinToString(", ") { it.name },
                        duration = song.song.duration,
                        onClick = { playLocalPlaylist(playerConnection, dbPlaylist!!.title, localSongs, index) },
                        onLongClick = { menuDbSong = song },
                    )
                }
            }

            menuDbSong?.let { song ->
                val songIndex = localSongs.indexOfFirst { it.id == song.id }.coerceAtLeast(0)
                TvSongActionsDialog(
                    title = song.title,
                    songId = song.id,
                    onPlayNow = { playLocalPlaylist(playerConnection, dbPlaylist!!.title, localSongs, songIndex) },
                    onPlayNext = { playerConnection?.playNext(song.toMediaItem()) },
                    onAddToQueue = { playerConnection?.addToQueue(song.toMediaItem()) },
                    onDismiss = { menuDbSong = null },
                )
            }
        } else {
            TvEmptyState(
                title = stringResource(R.string.tv_loading),
            )
        }
    }
}

private fun playPlaylist(
    playerConnection: PlayerConnection?,
    title: String,
    songs: List<SongItem>,
    startIndex: Int,
) {
    if (songs.isEmpty()) return
    playerConnection?.playQueue(
        ListQueue(
            title = title,
            items = songs.map { it.toMediaItem() },
            startIndex = startIndex,
        ),
    )
}

private fun playLocalPlaylist(
    playerConnection: PlayerConnection?,
    title: String,
    songs: List<com.capi.music.db.entities.Song>,
    startIndex: Int,
) {
    if (songs.isEmpty()) return
    playerConnection?.playQueue(
        ListQueue(
            title = title,
            items = songs.map { it.toMediaItem() },
            startIndex = startIndex,
        ),
    )
}

@Composable
private fun PlaylistSongRow(
    index: Int,
    title: String,
    artistsText: String,
    duration: Int,
    onClick: () -> Unit,
    onLongClick: () -> Unit,
) {
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
                    onClick = onClick,
                    onLongClick = onLongClick,
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
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium,
                color = TvTextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = artistsText,
                style = MaterialTheme.typography.bodyMedium,
                color = TvTextSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Text(
            text = formatSeconds(duration),
            style = MaterialTheme.typography.bodyMedium,
            color = TvTextSecondary,
        )
    }
}