package com.capi.music.tv.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.Repeat
import androidx.compose.material.icons.rounded.RepeatOne
import androidx.compose.material.icons.rounded.SkipNext
import androidx.compose.material.icons.rounded.SkipPrevious
import androidx.compose.material.icons.rounded.Shuffle
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.media3.common.Player
import androidx.media3.common.Timeline
import coil3.compose.AsyncImage
import com.capi.music.LocalPlayerConnection
import com.capi.music.R
import com.capi.music.tv.components.TvEmptyState
import com.capi.music.tv.components.TvIconButton
import com.capi.music.tv.components.TvPlayPauseButton
import com.capi.music.tv.components.TvSeekRow
import com.capi.music.tv.components.TvTextPrimary
import com.capi.music.tv.components.TvTextSecondary
import com.capi.music.tv.components.tvFocusable

private val PlayerBackground = Color(0xFF0D0D12)
private val PanelBackground = Color(0xFF17171E)

@Composable
private fun TvLazyQueueColumn(
    queueWindows: List<Timeline.Window>,
    currentIndex: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val listState = rememberLazyListState()
    var focusedIndex by remember { mutableStateOf<Int?>(null) }
    LaunchedEffect(focusedIndex) {
        focusedIndex?.let { index ->
            if (index in queueWindows.indices) listState.animateScrollToItem(index)
        }
    }
    LazyColumn(
        state = listState,
        modifier = modifier,
    ) {
        itemsIndexed(
            items = queueWindows,
            key = { _, window -> "${window.firstPeriodIndex}:${window.mediaItem.mediaId}" },
        ) { index, window ->
            val item = window.mediaItem
            val title = item.mediaMetadata.title?.toString() ?: item.mediaId
            val isCurrent = index == currentIndex
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .onFocusChanged { if (it.isFocused) focusedIndex = index }
                        .clip(MaterialTheme.shapes.medium)
                        .background(
                            if (isCurrent) MaterialTheme.colorScheme.primary.copy(alpha = 0.22f)
                            else Color.Transparent,
                        )
                        .tvFocusable(
                            shape = MaterialTheme.shapes.medium,
                            ringWidth = 2.dp,
                            onClick = { onSelect(index) },
                        )
                        .padding(horizontal = 18.dp, vertical = 14.dp),
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Medium,
                    color = if (isCurrent) MaterialTheme.colorScheme.primary else TvTextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun TvLyricsPanel(
    lyrics: String?,
    modifier: Modifier = Modifier,
) {
    val text = lyrics?.takeIf { it != com.capi.music.db.entities.LyricsEntity.LYRICS_NOT_FOUND }
    if (text.isNullOrBlank()) {
        TvEmptyState(
            title = stringResource(R.string.tv_no_lyrics),
            modifier = modifier,
        )
        return
    }
    Column(
        modifier =
            modifier
                .fillMaxWidth()
                .focusable()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 8.dp),
    ) {
        text.split("\n").forEach { line ->
            val clean = line.trim().replaceFirst(Regex("^\\[.*?]"), "").trim()
            Text(
                text = clean,
                style = MaterialTheme.typography.bodyLarge,
                color = TvTextSecondary,
                modifier = Modifier.padding(vertical = 6.dp),
            )
        }
    }
}

@Composable
private fun TvPanelTab(
    title: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
        color = if (selected) MaterialTheme.colorScheme.primary else TvTextSecondary,
        modifier =
            Modifier
                .tvFocusable(
                    shape = MaterialTheme.shapes.large,
                    ringWidth = 2.dp,
                    onClick = onClick,
                )
                .padding(horizontal = 20.dp, vertical = 10.dp),
    )
}

@Composable
fun TvPlayerScreen(
    onBack: () -> Unit,
) {
    val playerConnection = LocalPlayerConnection.current
    val metadata by playerConnection?.mediaMetadata?.collectAsState() ?: remember { mutableStateOf(null) }
    val isPlaying by playerConnection?.isPlaying?.collectAsState() ?: remember { mutableStateOf(false) }
    val queueWindows by playerConnection?.queueWindows?.collectAsState() ?: remember { mutableStateOf(emptyList()) }
    val currentIndex by playerConnection?.currentWindowIndex?.collectAsState() ?: remember { mutableStateOf(-1) }
    val shuffleEnabled by playerConnection?.shuffleModeEnabled?.collectAsState() ?: remember { mutableStateOf(false) }
    val repeatMode by playerConnection?.repeatMode?.collectAsState() ?: remember { mutableStateOf(Player.REPEAT_MODE_OFF) }
    val lyricsEntity by playerConnection?.currentLyrics?.collectAsState(initial = null) ?: remember { mutableStateOf(null) }

    if (metadata == null) {
        Box(
            modifier = Modifier.fillMaxSize().background(PlayerBackground),
            contentAlignment = Alignment.Center,
        ) {
            TvEmptyState(
                title = stringResource(R.string.tv_no_song_playing),
            )
        }
        return
    }
    val data = metadata ?: return

    val player = playerConnection?.player
    val positionMs = remember { mutableLongStateOf(0L) }
    val durationMs =
        remember(data.id) {
            mutableLongStateOf(data.duration.takeIf { it > 0 }?.toLong()?.times(1000) ?: 0L)
        }
    LaunchedEffect(player) {
        while (player != null) {
            positionMs.longValue = player.currentPosition
            kotlinx.coroutines.delay(500)
        }
    }

    var panelTab by rememberSaveable { mutableStateOf("queue") }
    val backFocus = remember { FocusRequester() }
    val seekFocus = remember { FocusRequester() }
    LaunchedEffect(Unit) { backFocus.requestFocus() }

    Row(
        modifier =
            Modifier
                .fillMaxSize()
                .background(PlayerBackground)
                .padding(horizontal = 36.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(28.dp),
    ) {
        Column(
            modifier = Modifier.weight(1.25f).fillMaxHeight(),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier =
                        Modifier
                            .focusRequester(backFocus)
                            .focusProperties {
                                down = seekFocus
                            }
                            .tvFocusable(
                                shape = RoundedCornerShape(14.dp),
                                ringWidth = 2.dp,
                                onClick = onBack,
                            )
                            .clip(RoundedCornerShape(14.dp))
                            .background(Color(0xFF23232A))
                            .padding(12.dp),
                ) {
                    Icon(
                        imageVector = Icons.Rounded.ArrowBack,
                        contentDescription = stringResource(R.string.tv_back),
                        tint = TvTextPrimary,
                    )
                }
                Spacer(Modifier.width(14.dp))
                Text(
                    text = stringResource(R.string.tv_back),
                    style = MaterialTheme.typography.titleMedium,
                    color = TvTextPrimary,
                )
            }

            if (panelTab == "queue") {
                Column(
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                ) {
                    AsyncImage(
                        model = data.thumbnailUrl,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier =
                            Modifier
                                .width(240.dp)
                                .aspectRatio(1f)
                                .shadow(
                                    elevation = 26.dp,
                                    shape = RoundedCornerShape(22.dp),
                                    spotColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.45f),
                                )
                                .border(1.dp, Color.White.copy(alpha = 0.10f), RoundedCornerShape(22.dp))
                                .clip(RoundedCornerShape(22.dp)),
                    )

                    Spacer(Modifier.height(20.dp))

                    Text(
                        text = data.title,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = TvTextPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp),
                    )
                    Text(
                        text = data.artists.joinToString(", ") { it.name },
                        style = MaterialTheme.typography.titleMedium,
                        color = TvTextSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp),
                    )
                }
            } else {
                TvLyricsPanel(
                    lyrics = lyricsEntity?.lyrics,
                    modifier = Modifier.weight(1f).fillMaxWidth().padding(top = 18.dp, bottom = 4.dp),
                )
            }

            Column(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp),
            ) {
                TvSeekRow(
                    positionMs = positionMs.longValue,
                    durationMs = durationMs.longValue,
                    onSeek = { player?.seekTo(it) },
                    focusRequester = seekFocus,
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center,
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp, bottom = 2.dp),
            ) {
                TvIconButton(
                    icon = Icons.Rounded.Shuffle,
                    contentDescription = stringResource(R.string.tv_shuffle),
                    active = shuffleEnabled,
                    size = 52.dp,
                    onClick = {
                        player?.let { it.shuffleModeEnabled = !it.shuffleModeEnabled }
                    },
                )
                Spacer(Modifier.width(18.dp))
                TvIconButton(
                    icon = Icons.Rounded.SkipPrevious,
                    contentDescription = stringResource(R.string.tv_previous),
                    size = 52.dp,
                    onClick = { playerConnection?.seekToPrevious() },
                )
                Spacer(Modifier.width(18.dp))
                TvPlayPauseButton(
                    isPlaying = isPlaying,
                    onPlayPause = {
                        player?.let {
                            it.playWhenReady = !it.playWhenReady
                        }
                    },
                    size = 72.dp,
                )
                Spacer(Modifier.width(18.dp))
                TvIconButton(
                    icon = Icons.Rounded.SkipNext,
                    contentDescription = stringResource(R.string.tv_next),
                    size = 52.dp,
                    onClick = { playerConnection?.seekToNext() },
                )
                Spacer(Modifier.width(18.dp))
                TvIconButton(
                    icon =
                        when (repeatMode) {
                            Player.REPEAT_MODE_ONE -> Icons.Rounded.RepeatOne
                            else -> Icons.Rounded.Repeat
                        },
                    contentDescription = stringResource(R.string.tv_repeat),
                    active = repeatMode != Player.REPEAT_MODE_OFF,
                    size = 52.dp,
                    onClick = {
                        player?.let {
                            it.repeatMode =

                                when (it.repeatMode) {
                                    Player.REPEAT_MODE_OFF -> Player.REPEAT_MODE_ALL
                                    Player.REPEAT_MODE_ALL -> Player.REPEAT_MODE_ONE
                                    else -> Player.REPEAT_MODE_OFF
                                }
                        }
                    },
                )
                Spacer(Modifier.width(18.dp))
                TvIconButton(
                    icon = if (data.liked) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder,
                    contentDescription = stringResource(R.string.tv_like),
                    active = data.liked,
                    onClick = { playerConnection?.toggleLike() },
                )
            }
        }

        Column(
            modifier =
                Modifier
                    .weight(0.75f)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(20.dp))
                    .background(PanelBackground),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp),
            ) {
                TvPanelTab(
                    title = stringResource(R.string.tv_queue),
                    selected = panelTab == "queue",
                    onClick = { panelTab = "queue" },
                )
                TvPanelTab(
                    title = stringResource(R.string.tv_lyrics),
                    selected = panelTab == "lyrics",
                    onClick = { panelTab = "lyrics" },
                )
            }
            when (panelTab) {
                "queue" ->
                    TvLazyQueueColumn(
                        queueWindows = queueWindows,
                        currentIndex = currentIndex,
                        onSelect = { index ->
                            player?.seekToDefaultPosition(index)
                            player?.playWhenReady = true
                        },
                        modifier = Modifier.weight(1f).fillMaxHeight(),
                    )

                else ->
                    TvEmptyState(
                        title = stringResource(R.string.tv_lyrics_hint),
                        modifier = Modifier.weight(1f).fillMaxHeight(),
                    )
            }
        }
    }
}