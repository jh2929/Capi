package com.jhezdev.capi.ui.menu

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import com.jhezdev.capi.LocalDatabase
import com.jhezdev.capi.R
import com.jhezdev.capi.db.entities.PlaylistEntity
import com.jhezdev.capi.db.entities.PlaylistSongMap
import com.jhezdev.capi.innertube.YouTube
import com.jhezdev.capi.innertube.models.SongItem
import com.jhezdev.capi.models.toMediaMetadata
import com.jhezdev.capi.ui.component.DefaultDialog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private sealed class UrlImportState {
    data object Input : UrlImportState()
    data object Loading : UrlImportState()
    data class Success(val playlistName: String) : UrlImportState()
    data class Error(val message: String) : UrlImportState()
    data class Duplicate(val existingId: String, val existingName: String) : UrlImportState()
}

private fun extractPlaylistId(url: String): String? {
    val prefixes = listOf("list=", "?list=", "&list=")
    for (prefix in prefixes) {
        val idx = url.indexOf(prefix)
        if (idx != -1) {
            val start = idx + prefix.length
            val end = url.indexOf('&', start).let { if (it == -1) url.length else it }
            val end2 = url.indexOf('#', start).let { if (it == -1) url.length else it }
            val id = url.substring(start, minOf(end, end2))
            if (id.isNotBlank() && id.length <= 100) return id
        }
    }
    return null
}

@Composable
fun ImportPlaylistUrlDialog(
    isVisible: Boolean,
    onDismiss: () -> Unit,
) {
    if (!isVisible) return

    val database = LocalDatabase.current
    val coroutineScope = rememberCoroutineScope()
    val context = LocalContext.current
    val focusRequester = remember { FocusRequester() }

    var state by remember { mutableStateOf<UrlImportState>(UrlImportState.Input) }
    var urlText by remember { mutableStateOf(TextFieldValue()) }
    var fetchedPlaylistName by remember { mutableStateOf("") }
    var fetchedBrowseId by remember { mutableStateOf<String?>(null) }
    var fetchedSongs by remember { mutableStateOf<List<SongItem>>(emptyList()) }
    var isProcessingDuplicate by remember { mutableStateOf(false) }

    fun resetAndDismiss() {
        state = UrlImportState.Input
        urlText = TextFieldValue()
        fetchedPlaylistName = ""
        fetchedBrowseId = null
        fetchedSongs = emptyList()
        isProcessingDuplicate = false
        onDismiss()
    }

    suspend fun performImport(name: String, browseId: String?, songs: List<SongItem>) {
        val songMetas = songs.map(SongItem::toMediaMetadata)
        database.withTransaction {
            val playlistEntity = PlaylistEntity(
                name = name,
                browseId = browseId,
                thumbnailUrl = songs.firstOrNull()?.thumbnail,
            )
            database.insert(playlistEntity)

            songMetas.forEachIndexed { idx, meta ->
                database.insert(meta)
                database.insert(
                    PlaylistSongMap(
                        songId = meta.id,
                        playlistId = playlistEntity.id,
                        position = idx,
                        setVideoId = meta.setVideoId
                    )
                )
            }
        }
    }

    fun startImport(playlistId: String) {
        state = UrlImportState.Loading
        coroutineScope.launch(Dispatchers.IO) {
            try {
                val result = YouTube.playlist(playlistId)
                result.onSuccess { page ->
                    val songs = page.songs.orEmpty()
                    if (songs.isEmpty()) {
                        state = UrlImportState.Error(context.getString(R.string.import_failed))
                        return@onSuccess
                    }
                    fetchedPlaylistName = page.playlist.title
                    fetchedBrowseId = playlistId
                    fetchedSongs = songs

                    val existing = database.playlistByBrowseId(playlistId).firstOrNull()
                    if (existing != null) {
                        state = UrlImportState.Duplicate(
                            existingId = existing.playlist.id,
                            existingName = existing.playlist.name
                        )
                    } else {
                        performImport(page.playlist.title, playlistId, songs)
                        state = UrlImportState.Success(page.playlist.title)
                    }
                }.onFailure { e ->
                    state = UrlImportState.Error(e.message ?: context.getString(R.string.import_failed))
                }
            } catch (e: Exception) {
                state = UrlImportState.Error(e.message ?: context.getString(R.string.import_failed))
            }
        }
    }

    DefaultDialog(
        onDismiss = { resetAndDismiss() },
        title = { Text(text = stringResource(R.string.import_playlist)) },
        buttons = {
            when (state) {
                is UrlImportState.Input -> {
                    TextButton(onClick = { resetAndDismiss() }) {
                        Text(text = stringResource(android.R.string.cancel))
                    }
                    TextButton(
                        enabled = extractPlaylistId(urlText.text) != null,
                        onClick = {
                            val id = extractPlaylistId(urlText.text)
                            if (id != null) startImport(id)
                        }
                    ) {
                        Text(text = stringResource(android.R.string.ok))
                    }
                }
                is UrlImportState.Loading -> {}
                is UrlImportState.Success -> {
                    TextButton(onClick = { resetAndDismiss() }) {
                        Text(text = stringResource(android.R.string.ok))
                    }
                }
                is UrlImportState.Error -> {
                    TextButton(onClick = { resetAndDismiss() }) {
                        Text(text = stringResource(android.R.string.cancel))
                    }
                    TextButton(
                        onClick = {
                            urlText = TextFieldValue()
                            state = UrlImportState.Input
                        }
                    ) {
                        Text(text = stringResource(R.string.retry))
                    }
                }
                is UrlImportState.Duplicate -> {}
            }
        },
    ) {
        when (val currentState = state) {
            is UrlImportState.Input -> {
                OutlinedTextField(
                    value = urlText,
                    onValueChange = { urlText = it },
                    placeholder = { Text(stringResource(R.string.import_playlist_url_hint)) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(
                        onDone = {
                            val id = extractPlaylistId(urlText.text)
                            if (id != null) startImport(id)
                        }
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .focusRequester(focusRequester),
                )
            }
            is UrlImportState.Loading -> {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator()
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(text = stringResource(R.string.import_loading))
                }
            }
            is UrlImportState.Success -> {
                Text(text = context.getString(R.string.playlist_imported))
            }
            is UrlImportState.Error -> {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = currentState.message)
                }
            }
            is UrlImportState.Duplicate -> {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = context.getString(R.string.already_in_playlist))
                    if (isProcessingDuplicate) {
                        Spacer(modifier = Modifier.height(16.dp))
                        CircularProgressIndicator()
                    }
                }
            }
        }
    }

    if (state is UrlImportState.Duplicate) {
        val dup = state as UrlImportState.Duplicate
        DefaultDialog(
            onDismiss = {
                if (!isProcessingDuplicate) resetAndDismiss()
            },
            title = { Text(text = stringResource(R.string.import_playlist)) },
            content = {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = context.getString(R.string.already_in_playlist))
                    if (isProcessingDuplicate) {
                        Spacer(modifier = Modifier.height(16.dp))
                        CircularProgressIndicator()
                    }
                }
            },
            buttons = {
                TextButton(
                    enabled = !isProcessingDuplicate,
                    onClick = { resetAndDismiss() }
                ) { Text(text = stringResource(android.R.string.cancel)) }

                TextButton(
                    enabled = !isProcessingDuplicate,
                    onClick = {
                        isProcessingDuplicate = true
                        coroutineScope.launch(Dispatchers.IO) {
                            try {
                                database.clearPlaylist(dup.existingId)
                                fetchedSongs.forEachIndexed { idx, song ->
                                    val meta = song.toMediaMetadata()
                                    database.insert(meta)
                                    database.insert(
                                        PlaylistSongMap(
                                            songId = meta.id,
                                            playlistId = dup.existingId,
                                            position = idx,
                                            setVideoId = meta.setVideoId
                                        )
                                    )
                                }
                                state = UrlImportState.Success(dup.existingName)
                            } catch (e: Exception) {
                                state = UrlImportState.Error(e.message ?: context.getString(R.string.import_failed))
                            }
                            isProcessingDuplicate = false
                        }
                    }
                ) { Text(text = stringResource(R.string.update_button)) }

                TextButton(
                    enabled = !isProcessingDuplicate,
                    onClick = {
                        isProcessingDuplicate = true
                        coroutineScope.launch(Dispatchers.IO) {
                            try {
                                performImport(fetchedPlaylistName, null, fetchedSongs)
                                state = UrlImportState.Success(fetchedPlaylistName)
                            } catch (e: Exception) {
                                state = UrlImportState.Error(e.message ?: context.getString(R.string.import_failed))
                            }
                            isProcessingDuplicate = false
                        }
                    }
                ) { Text(text = stringResource(R.string.import_playlist)) }
            }
        )
    }
}
