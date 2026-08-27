package com.capi.music.tv.screens

import com.capi.music.tv.components.TvTextPrimary
import com.capi.music.tv.components.TvTextSecondary

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.capi.music.LocalDatabase
import com.capi.music.LocalPlayerConnection
import com.capi.music.R
import com.capi.music.constants.AlbumSortType
import com.capi.music.constants.ArtistSortType
import com.capi.music.constants.PlaylistSortType
import com.capi.music.db.MusicDatabase
import com.capi.music.db.entities.Album
import com.capi.music.db.entities.Artist
import com.capi.music.db.entities.Playlist
import com.capi.music.db.entities.Song
import com.capi.music.extensions.toMediaItem
import com.capi.music.playback.queues.ListQueue
import com.capi.music.tv.components.TvButton
import com.capi.music.tv.components.TvCard
import com.capi.music.tv.components.TvCreatePlaylistDialog
import com.capi.music.tv.components.TvSectionRow
import com.capi.music.tv.components.TvSongActionsDialog
import com.capi.music.tv.components.TvSongCard
import com.capi.music.tv.components.tvFocusable
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class TvLibraryViewModel(private val database: MusicDatabase) : ViewModel() {
    val songs: StateFlow<List<Song>> =
        database.allSongs().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val albums: StateFlow<List<Album>> =
        database.albums(AlbumSortType.PLAY_TIME, true)
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val artists: StateFlow<List<Artist>> =
        database.artists(ArtistSortType.CREATE_DATE, true)
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val playlists: StateFlow<List<Playlist>> =
        database.playlists(PlaylistSortType.CREATE_DATE, true)
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
}

private enum class TvLibraryTab(val titleRes: Int) {
    Songs(R.string.tv_songs),
    Albums(R.string.tv_albums),
    Artists(R.string.tv_artists),
    Playlists(R.string.tv_playlists),
}

@Composable
fun TvLibraryScreen(
    onOpenAlbum: (String) -> Unit,
    onOpenArtist: (String) -> Unit,
    onOpenPlaylist: (String) -> Unit,
) {
    val database = LocalDatabase.current
    val viewModel = remember { TvLibraryViewModel(database) }
    val playerConnection = LocalPlayerConnection.current
    val songs by viewModel.songs.collectAsState()
    val albums by viewModel.albums.collectAsState()
    val artists by viewModel.artists.collectAsState()
    val playlists by viewModel.playlists.collectAsState()

    var selectedTab by rememberSaveable { mutableStateOf(TvLibraryTab.Songs) }
    var menuSong by remember { mutableStateOf<Song?>(null) }
    var showCreatePlaylist by rememberSaveable { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Column(
        modifier =
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(start = 8.dp, top = 20.dp, end = 40.dp, bottom = 24.dp),
    ) {
        Text(
            text = stringResource(R.string.tv_library),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = TvTextPrimary,
            modifier = Modifier.padding(start = 16.dp, bottom = 8.dp),
        )

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 12.dp),
        ) {
            TvLibraryTab.entries.forEach { tab ->
                val selected = tab == selectedTab
                Text(
                    text = stringResource(tab.titleRes),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                    color =
                        if (selected) MaterialTheme.colorScheme.primary
                        else TvTextSecondary,
                    modifier =
                        Modifier
                            .tvFocusable(
                                shape = MaterialTheme.shapes.large,
                                ringWidth = 2.dp,
                                onClick = { selectedTab = tab },
                            )
                            .padding(horizontal = 20.dp, vertical = 10.dp),
                )
            }
            Spacer(Modifier.weight(1f))
            if (selectedTab == TvLibraryTab.Albums || selectedTab == TvLibraryTab.Playlists) {
                TvButton(
                    label = stringResource(R.string.tv_new_playlist),
                    filled = true,
                    onClick = { showCreatePlaylist = true },
                )
            }
        }

        AnimatedContent(
            targetState = selectedTab,
            transitionSpec = {
                fadeIn(animationSpec = androidx.compose.animation.core.tween(220))
                    .togetherWith(fadeOut(animationSpec = androidx.compose.animation.core.tween(140)))
            },
            label = "tv-library-tab",
        ) { tab ->
            when (tab) {
                TvLibraryTab.Songs -> {
                    TvSectionRow(
                        title = stringResource(R.string.tv_songs),
                        items = songs,
                        placeholderCount = 4,
                        key = { it.id },
                    ) { song ->
                        TvSongCard(
                            songTitle = song.title,
                            artists = song.artists.joinToString(", ") { it.name },
                            thumbnailUrl = song.thumbnailUrl,
                            onClick = {
                                val index = songs.indexOfFirst { it.id == song.id }.coerceAtLeast(0)
                                playerConnection?.playQueue(
                                    ListQueue(
                                        title = song.title,
                                        items = songs.map { it.toMediaItem() },
                                        startIndex = index,
                                    ),
                                )
                            },
                            onLongClick = { menuSong = song },
                        )
                    }
                }

                TvLibraryTab.Albums -> {
                    TvSectionRow(
                        title = stringResource(R.string.tv_albums),
                        items = albums,
                        placeholderCount = 4,
                        key = { it.id },
                    ) { album ->
                        TvCard(
                            thumbnailUrl = album.thumbnailUrl,
                            title = album.title,
                            subtitle = album.artists?.firstOrNull()?.name,
                            onClick = { onOpenAlbum(album.id) },
                        )
                    }
                }

                TvLibraryTab.Artists -> {
                    TvSectionRow(
                        title = stringResource(R.string.tv_artists),
                        items = artists,
                        placeholderCount = 4,
                        key = { it.id },
                    ) { artist ->
                        TvCard(
                            thumbnailUrl = artist.thumbnailUrl,
                            title = artist.title,
                            subtitle = stringResource(R.string.tv_items, artist.songCount),
                            onClick = { onOpenArtist(artist.id) },
                        )
                    }
                }

                TvLibraryTab.Playlists -> {
                    TvSectionRow(
                        title = stringResource(R.string.tv_playlists),
                        items = playlists,
                        placeholderCount = 4,
                        key = { it.id },
                    ) { playlist ->
                        TvCard(
                            thumbnailUrl = playlist.songThumbnails.firstOrNull(),
                            title = playlist.title,
                            subtitle = stringResource(R.string.tv_items, playlist.songCount),
                            onClick = {
                                scope.launch {
                                    val playlistSongs = database.playlistSongs(playlist.id).first()
                                    playerConnection?.playQueue(
                                        ListQueue(
                                            title = playlist.title,
                                            items = playlistSongs.map { it.song.toMediaItem() },
                                            startIndex = 0,
                                        ),
                                    )
                                }
                            },
                        )
                    }
                }
            }
        }
    }

    menuSong?.let { song ->
        val index = songs.indexOfFirst { it.id == song.id }.coerceAtLeast(0)
        TvSongActionsDialog(
            title = song.title,
            songId = song.id,
            onPlayNow = {
                playerConnection?.playQueue(
                    ListQueue(
                        title = song.title,
                        items = songs.map { it.toMediaItem() },
                        startIndex = index,
                    ),
                )
            },
            onPlayNext = { playerConnection?.playNext(song.toMediaItem()) },
            onAddToQueue = { playerConnection?.addToQueue(song.toMediaItem()) },
            onDismiss = { menuSong = null },
        )
    }

    if (showCreatePlaylist) {
        TvCreatePlaylistDialog(onDismiss = { showCreatePlaylist = false })
    }
}
