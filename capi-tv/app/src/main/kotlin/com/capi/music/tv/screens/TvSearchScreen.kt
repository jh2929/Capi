package com.capi.music.tv.screens

import com.capi.music.tv.components.TvTextPrimary
import com.capi.music.tv.components.TvTextSecondary

import android.content.Context
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.capi.music.LocalPlayerConnection
import com.capi.music.R
import com.capi.music.constants.HideExplicitKey
import com.capi.music.constants.HideVideoKey
import com.capi.music.db.entities.Album
import com.capi.music.extensions.toMediaItem
import com.capi.music.innertube.YouTube
import com.capi.music.innertube.models.AlbumItem
import com.capi.music.innertube.models.ArtistItem
import com.capi.music.innertube.models.PlaylistItem
import com.capi.music.innertube.models.SongItem
import com.capi.music.innertube.models.YTItem
import com.capi.music.innertube.models.filterExplicit
import com.capi.music.innertube.models.filterVideo
import com.capi.music.playback.PlayerConnection
import com.capi.music.playback.queues.ListQueue
import com.capi.music.tv.components.TvCard
import com.capi.music.tv.components.TvEmptyState
import com.capi.music.tv.components.TvSectionRow
import com.capi.music.tv.components.TvSongCard
import com.capi.music.tv.components.tvFocusable
import com.capi.music.utils.dataStore
import com.capi.music.utils.get
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.launch

class TvSearchViewModel(private val context: Context) : ViewModel() {
    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query

    private val _suggestions = MutableStateFlow<List<String>>(emptyList())
    val suggestions: StateFlow<List<String>> = _suggestions

    private val _results = MutableStateFlow<List<YTItem>>(emptyList())
    val results: StateFlow<List<YTItem>> = _results

    init {
        viewModelScope.launch {
            _query
                .debounce(400)
                .collect { raw ->
                    val trimmed = raw.trim()
                    if (trimmed.length < 2) {
                        _suggestions.value = emptyList()
                        _results.value = emptyList()
                        return@collect
                    }
                    _suggestions.value =
                        YouTube.searchSuggestions(trimmed).getOrNull()?.queries.orEmpty()
                    val page = YouTube.searchSummary(trimmed).getOrNull()
                    val hideExplicit = context.dataStore.get(HideExplicitKey, false)
                    val hideVideo = context.dataStore.get(HideVideoKey, false)
                    _results.value =
                        page?.summaries
                            .orEmpty()
                            .flatMap { it.items }
                            .filterExplicit(hideExplicit)
                            .filterVideo(hideVideo)
                }
        }
    }

    fun onQueryChange(value: String) {
        _query.value = value
    }
}

@Composable
fun TvSearchScreen(
    onOpenAlbum: (String) -> Unit,
    onOpenArtist: (String) -> Unit,
    onOpenPlaylist: (String) -> Unit,
) {
    val context = LocalContext.current.applicationContext
    val viewModel = remember { TvSearchViewModel(context) }
    val query by viewModel.query.collectAsState()
    val suggestions by viewModel.suggestions.collectAsState()
    val results by viewModel.results.collectAsState()
    val playerConnection = LocalPlayerConnection.current
    val inputFocus = remember { FocusRequester() }
    val shape = MaterialTheme.shapes.extraLarge

    Column(
        modifier =
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(start = 8.dp, top = 20.dp, end = 40.dp, bottom = 24.dp),
    ) {
        Surface(
            shape = shape,
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
            modifier =
                Modifier
                    .fillMaxWidth()
                    .tvFocusable(shape = shape, onClick = { inputFocus.requestFocus() }),
        ) {
            Box(
                contentAlignment = Alignment.CenterStart,
                modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 14.dp, bottom = 14.dp),
            ) {
                Icon(
                    imageVector = Icons.Rounded.Search,
                    contentDescription = null,
                    tint = TvTextSecondary,
                )
                BasicTextField(
                    value = query,
                    onValueChange = viewModel::onQueryChange,
                    textStyle =
                        TextStyle(
                            color = TvTextPrimary,
                            fontSize = 30.sp,
                            fontWeight = FontWeight.Medium,
                        ),
                    cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                    singleLine = true,
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .padding(start = 52.dp)
                            .focusRequester(inputFocus),
                )
            }
        }

        if (query.trim().length < 2) {
            if (suggestions.isEmpty()) {
                TvEmptyState(
                    title = stringResource(R.string.tv_search_hint),
                )
            } else {
                TvSectionRow(
                    title = stringResource(R.string.tv_suggestions),
                    items = suggestions,
                    key = { it },
                ) { suggestion ->
                    Text(
                        text = suggestion,
                        style = MaterialTheme.typography.titleMedium,
                        color = TvTextPrimary,
                        modifier =
                            Modifier
                                .tvFocusable(shape = shape) {
                                    viewModel.onQueryChange(suggestion)
                                }
                                .padding(horizontal = 20.dp, vertical = 14.dp),
                    )
                }
            }
        } else {
            TvSectionRow(
                title = stringResource(R.string.tv_songs),
                items = results.filterIsInstance<SongItem>(),
                key = { it.id },
            ) { song ->
                TvSongCard(
                    songTitle = song.title,
                    artists = song.artists.joinToString(", ") { it.name },
                    thumbnailUrl = song.thumbnail,
                    onClick = {
                        val songs = results.filterIsInstance<SongItem>()
                        playerConnection?.playQueue(
                            ListQueue(
                                title = song.title,
                                items = songs.map { it.toMediaItem() },
                                startIndex = songs.indexOfFirst { it.id == song.id }.coerceAtLeast(0),
                            ),
                        )
                    },
                )
            }

            TvSectionRow(
                title = stringResource(R.string.tv_albums),
                items = results.filterIsInstance<AlbumItem>(),
                key = { it.id },
            ) { album ->
                TvCard(
                    thumbnailUrl = album.thumbnail,
                    title = album.title,
                    subtitle = album.artists?.joinToString(", ") { it.name },
                    onClick = { onOpenAlbum(album.browseId) },
                )
            }

            TvSectionRow(
                title = stringResource(R.string.tv_artists),
                items = results.filterIsInstance<ArtistItem>(),
                key = { it.id },
            ) { artist ->
                TvCard(
                    thumbnailUrl = artist.thumbnail,
                    title = artist.title,
                    subtitle = artist.subscriberCountText,
                    onClick = { onOpenArtist(artist.id) },
                )
            }

            TvSectionRow(
                title = stringResource(R.string.tv_playlists),
                items = results.filterIsInstance<PlaylistItem>(),
                key = { it.id },
            ) { playlist ->
                TvCard(
                    thumbnailUrl = playlist.thumbnail,
                    title = playlist.title,
                    subtitle = playlist.author?.name,
                    onClick = { onOpenPlaylist(playlist.id) },
                )
            }

            if (results.isEmpty()) {
                TvEmptyState(
                    title = stringResource(R.string.tv_no_results),
                )
            }
        }
    }
}