package com.capi.music.tv.screens

import com.capi.music.tv.components.TvTextPrimary
import com.capi.music.tv.components.TvTextSecondary

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.SavedStateHandle
import com.capi.music.innertube.models.Album
import coil3.compose.AsyncImage
import com.capi.music.LocalDatabase
import com.capi.music.LocalPlayerConnection
import com.capi.music.R
import com.capi.music.extensions.toMediaItem
import com.capi.music.playback.queues.ListQueue
import com.capi.music.tv.components.TvButton
import com.capi.music.tv.components.TvCard
import com.capi.music.tv.components.TvEmptyState
import com.capi.music.tv.components.TvSectionRow
import com.capi.music.tv.components.TvSongActionsDialog
import com.capi.music.tv.components.TvSongCard
import com.capi.music.tv.components.tvFocusable
import com.capi.music.viewmodels.ArtistViewModel

@Composable
fun TvArtistScreen(
    artistId: String,
    onBack: () -> Unit,
    onOpenAlbum: (String) -> Unit,
    onOpenPlaylist: (String) -> Unit,
) {
    val context = LocalContext.current
    val database = LocalDatabase.current
    val viewModel =
        remember(artistId) {
            ArtistViewModel(context, database, SavedStateHandle(mapOf("artistId" to artistId)))
        }
    val artistPage = viewModel.artistPage
    val librarySongs by viewModel.librarySongs.collectAsState()
    val libraryAlbums by viewModel.libraryAlbums.collectAsState()
    val libraryArtist by viewModel.libraryArtist.collectAsState()
    val playerConnection = LocalPlayerConnection.current
    var menuSong by remember { mutableStateOf<com.capi.music.db.entities.Song?>(null) }

    val displayName = artistPage?.artist?.title ?: libraryArtist?.title ?: ""
    val thumbnail = artistPage?.artist?.thumbnail ?: libraryArtist?.thumbnailUrl

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

        if (displayName.isNotEmpty()) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(26.dp),
                modifier = Modifier.padding(bottom = 20.dp),
            ) {
                if (thumbnail != null) {
                    AsyncImage(
                        model = thumbnail,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier =
                            Modifier
                                .size(190.dp)
                                .clip(CircleShape),
                    )
                }
                Column {
                    Text(
                        text = displayName,
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = TvTextPrimary,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    artistPage?.artist?.monthlyListenerCountText?.let {
                        Text(
                            text = it,
                            style = MaterialTheme.typography.bodyMedium,
                            color = TvTextSecondary,
                        )
                    }
                    Spacer(Modifier.height(16.dp))
                    TvButton(
                        label = stringResource(R.string.tv_shuffle),
                        onClick = {
                            if (librarySongs.isNotEmpty()) {
                                playerConnection?.player?.shuffleModeEnabled = true
                                playerConnection?.playQueue(
                                    ListQueue(
                                        title = displayName,
                                        items = librarySongs.map { it.toMediaItem() },
                                        startIndex = 0,
                                    ),
                                )
                            }
                        },
                    )
                }
            }

            TvSectionRow(
                title = stringResource(R.string.tv_songs),
                items = librarySongs,
                placeholderCount = 4,
                key = { it.id },
            ) { song ->
                TvSongCard(
                    songTitle = song.title,
                    artists = song.artists.joinToString(", ") { it.name },
                    thumbnailUrl = song.thumbnailUrl,
                    onClick = {
                        val index = librarySongs.indexOfFirst { it.id == song.id }.coerceAtLeast(0)
                        playerConnection?.playQueue(
                            ListQueue(
                                title = displayName,
                                items = librarySongs.map { it.toMediaItem() },
                                startIndex = index,
                            ),
                        )
                    },
                    onLongClick = { menuSong = song },
                )
            }

            TvSectionRow(
                title = stringResource(R.string.tv_albums),
                items = libraryAlbums,
                key = { it.id },
            ) { album ->
                TvCard(
                    thumbnailUrl = album.thumbnailUrl,
                    title = album.title,
                    subtitle = album.album.year?.toString(),
                    onClick = { onOpenAlbum(album.id) },
                )
            }
        } else {
            TvEmptyState(
                title = stringResource(R.string.tv_artist_not_found),
            )
        }
    }

    menuSong?.let { song ->
        val index = librarySongs.indexOfFirst { it.id == song.id }.coerceAtLeast(0)
        TvSongActionsDialog(
            title = song.title,
            songId = song.id,
            onPlayNow = {
                playerConnection?.playQueue(
                    ListQueue(
                        title = displayName,
                        items = librarySongs.map { it.toMediaItem() },
                        startIndex = index,
                    ),
                )
            },
            onPlayNext = { playerConnection?.playNext(song.toMediaItem()) },
            onAddToQueue = { playerConnection?.addToQueue(song.toMediaItem()) },
            onDismiss = { menuSong = null },
        )
    }
}