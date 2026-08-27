package com.capi.music.tv.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.PlaylistAdd
import androidx.compose.material.icons.rounded.QueueMusic
import androidx.compose.material.icons.rounded.SkipNext
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.capi.music.LocalDatabase
import com.capi.music.R
import com.capi.music.db.entities.Playlist
import com.capi.music.db.entities.PlaylistEntity
import com.capi.music.db.entities.PlaylistSongMap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDateTime

private val MenuPanelColor = Color(0xFF1A1A22)
private val MenuHoverColor = Color.White.copy(alpha = 0.06f)

@Composable
fun TvSongActionsDialog(
    title: String,
    songId: String,
    onPlayNow: () -> Unit,
    onPlayNext: () -> Unit,
    onAddToQueue: () -> Unit,
    onDismiss: () -> Unit,
) {
    var showPicker by remember { mutableStateOf(false) }
    if (showPicker) {
        TvPlaylistPickerDialog(songId = songId, onDismiss = onDismiss)
        return
    }
    TvMenuDialog(title = title, onDismiss = onDismiss) {
        TvMenuRow(
            label = stringResource(R.string.tv_play_now),
            icon = Icons.Rounded.PlayArrow,
            autoFocus = true,
            onClick = {
                onPlayNow()
                onDismiss()
            },
        )
        TvMenuRow(
            label = stringResource(R.string.tv_play_next),
            icon = Icons.Rounded.SkipNext,
            onClick = {
                onPlayNext()
                onDismiss()
            },
        )
        TvMenuRow(
            label = stringResource(R.string.tv_add_to_queue),
            icon = Icons.Rounded.QueueMusic,
            onClick = {
                onAddToQueue()
                onDismiss()
            },
        )
        TvMenuRow(
            label = stringResource(R.string.tv_save_to_playlist),
            icon = Icons.Rounded.PlaylistAdd,
            onClick = { showPicker = true },
        )
    }
}

@Composable
fun TvPlaylistPickerDialog(
    songId: String?,
    onDismiss: () -> Unit,
) {
    val database = LocalDatabase.current
    val scope = rememberCoroutineScope()
    val playlists by
        remember {
            database.editablePlaylistsByCreateDateAsc()
                .stateIn(scope, SharingStarted.WhileSubscribed(5_000), emptyList())
        }.collectAsState()
    var showCreate by remember { mutableStateOf(false) }

    if (showCreate) {
        TvCreatePlaylistDialog(
            onDismiss = { showCreate = false },
            onCreated = { playlist ->
                songId?.let { id ->
                    scope.launch(Dispatchers.IO) {
                        database.insert(
                            PlaylistSongMap(
                                songId = id,
                                playlistId = playlist.id,
                                position = 0,
                            ),
                        )
                    }
                }
                onDismiss()
            },
        )
        return
    }

    TvMenuDialog(
        title = stringResource(R.string.tv_save_to_playlist),
        onDismiss = onDismiss,
    ) {
        TvMenuRow(
            label = stringResource(R.string.tv_new_playlist),
            icon = Icons.Rounded.Add,
            autoFocus = true,
            onClick = { showCreate = true },
        )
        playlists.forEach { playlist ->
            TvMenuRow(
                label = playlist.title,
                subtitle = stringResource(R.string.tv_items, playlist.songCount),
                icon = Icons.Rounded.PlaylistAdd,
                onClick = {
                    songId?.let { id ->
                        scope.launch(Dispatchers.IO) {
                            database.addSongToPlaylist(playlist, listOf(id))
                        }
                    }
                    onDismiss()
                },
            )
        }
    }
}

@Composable
fun TvCreatePlaylistDialog(
    onDismiss: () -> Unit,
    onCreated: (PlaylistEntity) -> Unit = {},
) {
    val database = LocalDatabase.current
    var name by remember { mutableStateOf("") }
    val fieldFocus = remember { FocusRequester() }
    val createFocus = remember { FocusRequester() }
    val scope = rememberCoroutineScope()

    val createPlaylist = {
        val trimmed = name.trim()
        if (trimmed.isNotEmpty()) {
            val playlist =
                PlaylistEntity(
                    name = trimmed,
                    bookmarkedAt = LocalDateTime.now(),
                    isEditable = true,
                )
            scope.launch(Dispatchers.IO) { database.insert(playlist) }
            onCreated(playlist)
        }
    }

    LaunchedEffect(Unit) { fieldFocus.requestFocus() }

    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier =
                Modifier
                    .width(640.dp)
                    .background(MenuPanelColor, RoundedCornerShape(24.dp))
                    .border(1.dp, Color.White.copy(alpha = 0.10f), RoundedCornerShape(24.dp))
                    .padding(24.dp),
        ) {
            Text(
                text = stringResource(R.string.tv_new_playlist),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = TvTextPrimary,
            )
            Spacer(Modifier.height(18.dp))

            Box(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF232329), RoundedCornerShape(14.dp))
                        .border(1.dp, Color.White.copy(alpha = 0.10f), RoundedCornerShape(14.dp))
                        .padding(horizontal = 16.dp, vertical = 14.dp),
            ) {
                BasicTextField(
                    value = name,
                    onValueChange = { name = it },
                    textStyle =
                        TextStyle(
                            color = TvTextPrimary,
                            fontSize = MaterialTheme.typography.titleLarge.fontSize,
                            fontWeight = FontWeight.Medium,
                        ),
                    singleLine = true,
                    cursorBrush = androidx.compose.ui.graphics.SolidColor(MaterialTheme.colorScheme.primary),
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .focusRequester(fieldFocus)
                            .focusProperties { down = createFocus }
                            .onKeyEvent { event ->
                                if (event.type == KeyEventType.KeyDown) {
                                    when (event.key) {
                                        Key.DirectionDown -> {
                                            scope.launch { createFocus.requestFocus() }
                                            true
                                        }

                                        Key.DirectionCenter, Key.Enter, Key.NumPadEnter -> {
                                            createPlaylist()
                                            true
                                        }

                                        else -> false
                                    }
                                } else {
                                    false
                                }
                            },
                )
                if (name.isEmpty()) {
                    Text(
                        text = stringResource(R.string.playlist_name),
                        style = MaterialTheme.typography.titleLarge,
                        color = TvTextSecondary,
                    )
                }
            }

            Spacer(Modifier.height(20.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.align(Alignment.End),
            ) {
                TvButton(
                    label = stringResource(R.string.cancel),
                    onClick = onDismiss,
                )
                TvButton(
                    label = stringResource(R.string.tv_create),
                    filled = true,
                    onClick = createPlaylist,
                    modifier = Modifier.focusRequester(createFocus).focusProperties { up = fieldFocus },
                )
            }
        }
    }
}

@Composable
private fun TvMenuDialog(
    title: String,
    onDismiss: () -> Unit,
    content: @Composable ColumnScope.() -> Unit,
) {
    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier =
                Modifier
                    .width(520.dp)
                    .background(MenuPanelColor, RoundedCornerShape(24.dp))
                    .border(1.dp, Color.White.copy(alpha = 0.10f), RoundedCornerShape(24.dp))
                    .padding(vertical = 22.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(start = 24.dp, end = 16.dp, bottom = 14.dp),
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = TvTextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Box(
                    contentAlignment = Alignment.Center,
                    modifier =
                        Modifier
                            .tvFocusable(
                                shape = RoundedCornerShape(12.dp),
                                ringWidth = 2.dp,
                                onClick = onDismiss,
                            )
                            .padding(8.dp),
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Close,
                        contentDescription = stringResource(R.string.tv_back),
                        tint = TvTextSecondary,
                    )
                }
            }
            Column(
                verticalArrangement = Arrangement.spacedBy(4.dp),
                modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()),
            ) {
                content()
            }
        }
    }
}

@Composable
private fun ColumnScope.TvMenuRow(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    icon: ImageVector,
    autoFocus: Boolean = false,
) {
    val focusRequester = remember { FocusRequester() }
    var focused by remember { mutableStateOf(false) }
    LaunchedEffect(autoFocus) {
        if (autoFocus) focusRequester.requestFocus()
    }
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier =
            modifier
                .fillMaxWidth()
                .focusRequester(focusRequester)
                .onFocusChanged { focused = it.isFocused || it.hasFocus }
                .tvFocusable(
                    shape = RoundedCornerShape(14.dp),
                    ringWidth = 2.dp,
                    scale = 1.02f,
                    onClick = onClick,
                )
                .background(
                    if (focused) MenuHoverColor else Color.Transparent,
                    RoundedCornerShape(14.dp),
                )
                .padding(horizontal = 24.dp, vertical = 13.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = if (focused) MaterialTheme.colorScheme.primary else TvTextSecondary,
        )
        Spacer(Modifier.width(16.dp))
        Column(Modifier.weight(1f)) {
            Text(
                text = label,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = if (focused) FontWeight.Bold else FontWeight.Medium,
                color = if (focused) MaterialTheme.colorScheme.primary else TvTextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (subtitle != null) {
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = TvTextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}
