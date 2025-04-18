package com.arturo254.opentune.ui.screens.search

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.arturo254.opentune.LocalPlayerConnection
import com.arturo254.opentune.R
import com.arturo254.opentune.constants.CONTENT_TYPE_LIST
import com.arturo254.opentune.constants.ListItemHeight
import com.arturo254.opentune.db.entities.Album
import com.arturo254.opentune.db.entities.Artist
import com.arturo254.opentune.db.entities.Playlist
import com.arturo254.opentune.db.entities.Song
import com.arturo254.opentune.extensions.toMediaItem
import com.arturo254.opentune.extensions.togglePlayPause
import com.arturo254.opentune.playback.queues.ListQueue
import com.arturo254.opentune.ui.component.*
import com.arturo254.opentune.ui.menu.SongMenu
import com.arturo254.opentune.viewmodels.LocalFilter
import com.arturo254.opentune.viewmodels.LocalSearchViewModel
import kotlinx.coroutines.flow.drop

@OptIn(ExperimentalFoundationApi::class, ExperimentalMaterial3Api::class)
@Composable
fun LocalSearchScreen(
    query: String,
    navController: NavController,
    onDismiss: () -> Unit,
    viewModel: LocalSearchViewModel = hiltViewModel(),
) {
    val context = LocalContext.current
    val keyboardController = LocalSoftwareKeyboardController.current
    val menuState = LocalMenuState.current
    val playerConnection = LocalPlayerConnection.current ?: return
    val isPlaying by playerConnection.isPlaying.collectAsState()
    val mediaMetadata by playerConnection.mediaMetadata.collectAsState()

    val searchFilter by viewModel.filter.collectAsState()
    val result by viewModel.result.collectAsState()

    // Estado para el texto de búsqueda
    var searchText by remember { mutableStateOf(query) }
    val focusRequester = remember { FocusRequester() }

    val lazyListState = rememberLazyListState()

    // Efecto para ocultar el teclado al desplazarse
    LaunchedEffect(Unit) {
        snapshotFlow { lazyListState.firstVisibleItemScrollOffset }
            .drop(1)
            .collect {
                keyboardController?.hide()
            }
    }

    // Actualiza la consulta cuando cambia externamente
    LaunchedEffect(query) {
        searchText = query
        viewModel.query.value = query
    }

    // Efecto para solicitar foco cuando se muestra la pantalla
    LaunchedEffect(Unit) {
        // Pequeño retraso para asegurar que la UI esté lista
        kotlinx.coroutines.delay(100)
        focusRequester.requestFocus()
    }

    Column(modifier = Modifier.fillMaxSize()) {
        // Barra de búsqueda mejorada
        Surface(
            modifier = Modifier.fillMaxWidth(),
            tonalElevation = 4.dp,
            shadowElevation = 4.dp,
        ) {
            Column(modifier = Modifier.fillMaxWidth()) {
                // Barra de búsqueda con diseño actualizado
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Botón de retroceso
                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.size(40.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = null
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    // Campo de búsqueda
                    TextField(
                        value = searchText,
                        onValueChange = {
                            searchText = it
                            viewModel.query.value = it
                        },
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(24.dp))
                            .focusRequester(focusRequester),
                        placeholder = {
                            Text(stringResource(R.string.search_library))
                        },
                        leadingIcon = {
                            Icon(
                                imageVector = Icons.Default.Search,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        },
                        trailingIcon = {
                            AnimatedVisibility(
                                visible = searchText.isNotEmpty(),
                                enter = fadeIn(),
                                exit = fadeOut()
                            ) {
                                IconButton(
                                    onClick = {
                                        searchText = ""
                                        viewModel.query.value = ""
                                        focusRequester.requestFocus()
                                    }
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Clear,
                                        contentDescription = null
                                    )
                                }
                            }
                        },
                        singleLine = true,
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                            unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                            disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent
                        )
                    )
                }

                // Chips de filtro mejorados
                ChipsRow(
                    chips = listOf(
                        LocalFilter.ALL to stringResource(R.string.filter_all),
                        LocalFilter.SONG to stringResource(R.string.filter_songs),
                        LocalFilter.ALBUM to stringResource(R.string.filter_albums),
                        LocalFilter.ARTIST to stringResource(R.string.filter_artists),
                        LocalFilter.PLAYLIST to stringResource(R.string.filter_playlists)
                    ),
                    currentValue = searchFilter,
                    onValueUpdate = { viewModel.filter.value = it },
                    containerColor = MaterialTheme.colorScheme.surface,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }

        // Contenido de resultados de búsqueda
        LazyColumn(
            state = lazyListState,
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(vertical = 8.dp)
        ) {
            result.map.forEach { (filter, items) ->
                if (result.filter == LocalFilter.ALL) {
                    item(
                        key = filter,
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(ListItemHeight)
                                .clickable { viewModel.filter.value = filter }
                                .padding(start = 16.dp, end = 18.dp),
                        ) {
                            Text(
                                text = stringResource(
                                    when (filter) {
                                        LocalFilter.SONG -> R.string.filter_songs
                                        LocalFilter.ALBUM -> R.string.filter_albums
                                        LocalFilter.ARTIST -> R.string.filter_artists
                                        LocalFilter.PLAYLIST -> R.string.filter_playlists
                                        LocalFilter.ALL -> error("")
                                    },
                                ),
                                style = MaterialTheme.typography.titleLarge,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.weight(1f),
                            )

                            Icon(
                                painter = painterResource(R.drawable.navigate_next),
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }

                items(
                    items = items,
                    key = { it.id },
                    contentType = { CONTENT_TYPE_LIST },
                ) { item ->
                    when (item) {
                        is Song ->
                            SongListItem(
                                song = item,
                                showInLibraryIcon = true,
                                isActive = item.id == mediaMetadata?.id,
                                isPlaying = isPlaying,
                                trailingContent = {
                                    IconButton(
                                        onClick = {
                                            menuState.show {
                                                SongMenu(
                                                    originalSong = item,
                                                    navController = navController,
                                                ) {
                                                    onDismiss()
                                                    menuState.dismiss()
                                                }
                                            }
                                        },
                                    ) {
                                        Icon(
                                            painter = painterResource(R.drawable.more_vert),
                                            contentDescription = null,
                                        )
                                    }
                                },
                                modifier = Modifier
                                    .combinedClickable(
                                        onClick = {
                                            if (item.id == mediaMetadata?.id) {
                                                playerConnection.player.togglePlayPause()
                                            } else {
                                                val songs = result.map
                                                    .getOrDefault(LocalFilter.SONG, emptyList())
                                                    .filterIsInstance<Song>()
                                                    .map { it.toMediaItem() }
                                                playerConnection.playQueue(
                                                    ListQueue(
                                                        title = context.getString(R.string.queue_searched_songs),
                                                        items = songs,
                                                        startIndex = songs.indexOfFirst { it.mediaId == item.id },
                                                    ),
                                                )
                                            }
                                        },
                                        onLongClick = {
                                            menuState.show {
                                                SongMenu(
                                                    originalSong = item,
                                                    navController = navController,
                                                ) {
                                                    onDismiss()
                                                    menuState.dismiss()
                                                }
                                            }
                                        },
                                    )
                                    .animateItem(),
                            )

                        is Album ->
                            AlbumListItem(
                                album = item,
                                isActive = item.id == mediaMetadata?.album?.id,
                                isPlaying = isPlaying,
                                modifier = Modifier
                                    .clickable {
                                        onDismiss()
                                        navController.navigate("album/${item.id}")
                                    }
                                    .animateItem(),
                            )

                        is Artist ->
                            ArtistListItem(
                                artist = item,
                                modifier = Modifier
                                    .clickable {
                                        onDismiss()
                                        navController.navigate("artist/${item.id}")
                                    }
                                    .animateItem(),
                            )

                        is Playlist ->
                            PlaylistListItem(
                                playlist = item,
                                modifier = Modifier
                                    .clickable {
                                        onDismiss()
                                        navController.navigate("local_playlist/${item.id}")
                                    }
                                    .animateItem(),
                            )
                    }
                }
            }

            // Mensaje cuando no hay resultados
            if (result.query.isNotEmpty() && result.map.isEmpty()) {
                item(
                    key = "no_result",
                ) {
                    EmptyPlaceholder(
                        icon = R.drawable.search,
                        text = stringResource(R.string.no_results_found),
                        modifier = Modifier.padding(top = 32.dp)
                    )
                }
            }
        }
    }
}