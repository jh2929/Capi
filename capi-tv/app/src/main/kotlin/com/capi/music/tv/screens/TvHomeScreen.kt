package com.capi.music.tv.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.capi.music.LocalPlayerConnection
import com.capi.music.R
import com.capi.music.db.entities.Album
import com.capi.music.db.entities.Artist
import com.capi.music.db.entities.Playlist
import com.capi.music.db.entities.Song
import com.capi.music.innertube.models.AlbumItem
import com.capi.music.innertube.models.ArtistItem
import com.capi.music.innertube.models.PlaylistItem
import com.capi.music.innertube.models.SongItem
import com.capi.music.innertube.models.YTItem
import com.capi.music.extensions.toMediaItem
import com.capi.music.playback.PlayerConnection
import com.capi.music.playback.queues.ListQueue
import com.capi.music.tv.components.TvCard
import com.capi.music.tv.components.TvEmptyState
import com.capi.music.tv.components.TvSearchBar
import com.capi.music.tv.components.TvSectionRow
import com.capi.music.tv.components.TvSongActionsDialog
import com.capi.music.tv.components.TvSongCard
import com.capi.music.viewmodels.HomeViewModel

@Composable
fun TvHomeScreen(
    homeViewModel: HomeViewModel = hiltViewModel(),
    onOpenSearch: () -> Unit,
    onOpenAlbum: (String) -> Unit,
    onOpenArtist: (String) -> Unit,
    onOpenPlaylist: (String) -> Unit,
) {
    val keepListening by homeViewModel.keepListening.collectAsState()
    val homePage by homeViewModel.homePage.collectAsState()
    val explorePage by homeViewModel.explorePage.collectAsState()

    val playerConnection = LocalPlayerConnection.current
    var menuSong by remember { mutableStateOf<SongItem?>(null) }

    Column(
        modifier =
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(start = 8.dp, top = 20.dp, end = 40.dp, bottom = 24.dp),
    ) {
        TvSearchBar(
            onClick = onOpenSearch,
            modifier = Modifier.padding(start = 16.dp, end = 8.dp, bottom = 10.dp),
        )

        TvSectionRow(
            title = stringResource(R.string.tv_keep_listening),
            items = keepListening,
            placeholderCount = 4,
            key = { it.id },
        ) { item ->
            TvCard(
                thumbnailUrl = item.thumbnailUrl,
                title = item.title,
                subtitle =
                    when (item) {
                        is Album -> stringResource(R.string.tv_album)
                        is Artist -> stringResource(R.string.tv_artist)
                        is Playlist -> stringResource(R.string.tv_playlist)
                        is Song -> item.artists.joinToString(", ") { it.name }
                    },
                onClick = {
                    when (item) {
                        is Album -> onOpenAlbum(item.id)
                        is Artist -> onOpenArtist(item.id)
                        is Playlist -> onOpenPlaylist(item.id)
                        is Song -> playQueue(playerConnection, listOf(item), 0)
                    }
                },
            )
        }

        homePage?.sections?.forEach { section ->
            val songs = section.items.filterIsInstance<SongItem>()
            val albums = section.items.filterIsInstance<AlbumItem>()
            val artists = section.items.filterIsInstance<ArtistItem>()
            val playlists = section.items.filterIsInstance<PlaylistItem>()

            when {
                songs.size > albums.size && songs.size > artists.size && songs.size > playlists.size -> {
                    TvSectionRow(
                        title = section.title,
                        items = songs,
                        placeholderCount = 4,
                        key = { it.id },
                    ) { song ->
                        TvSongCard(
                            songTitle = song.title,
                            artists = song.artists.joinToString(", ") { it.name },
                            thumbnailUrl = song.thumbnail,
                            onClick = {
                                playerConnection?.playQueue(
                                    ListQueue(
                                        title = section.title,
                                        items = songs.map { it.toMediaItem() },
                                        startIndex = songs.indexOfFirst { it.id == song.id }.coerceAtLeast(0),
                                    ),
                                )
                            },
                            onLongClick = { menuSong = song },
                        )
                    }
                }

                else -> {
                    TvSectionRow(
                        title = section.title,
                        items = section.items,
                        placeholderCount = 4,
                        key = { it.id },
                    ) { item ->
                        TvCard(
                            thumbnailUrl = item.thumbnail,
                            title = item.title,
                            subtitle =
                                when (item) {
                                    is AlbumItem -> item.artists?.joinToString(", ") { it.name }
                                    is PlaylistItem -> item.author?.name
                                    else -> null
                                },
                            onClick = {
                                when (item) {
                                    is AlbumItem -> onOpenAlbum(item.browseId)
                                    is ArtistItem -> onOpenArtist(item.id)
                                    is PlaylistItem -> onOpenPlaylist(item.id)
                                    else -> Unit
                                }
                            },
                        )
                    }
                }
            }
        }

        val newReleases = explorePage?.newReleaseAlbums.orEmpty()
        if (newReleases.isNotEmpty()) {
            TvSectionRow(
                title = stringResource(R.string.tv_new_releases),
                items = newReleases,
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

        if (keepListening.isNullOrEmpty() && homePage?.sections.isNullOrEmpty()) {
            TvEmptyState(
                title = stringResource(R.string.tv_loading),
            )
        }
    }

    menuSong?.let { song ->
        TvSongActionsDialog(
            title = song.title,
            songId = song.id,
            onPlayNow = {
                playerConnection?.playQueue(
                    ListQueue(
                        title = song.title,
                        items = listOf(song.toMediaItem()),
                        startIndex = 0,
                    ),
                )
            },
            onPlayNext = { playerConnection?.playNext(song.toMediaItem()) },
            onAddToQueue = { playerConnection?.addToQueue(song.toMediaItem()) },
            onDismiss = { menuSong = null },
        )
    }
}

private fun playQueue(
    playerConnection: PlayerConnection?,
    songs: List<Song>,
    startIndex: Int,
) {
    playerConnection?.playQueue(
        ListQueue(
            title = songs.firstOrNull()?.title.orEmpty(),
            items = songs.map { it.toMediaItem() },
            startIndex = startIndex,
        ),
    )
}