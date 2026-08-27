package com.capi.music.tv.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.DownloadDone
import androidx.compose.material.icons.rounded.MusicNote
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.capi.music.R
import com.capi.music.db.entities.ArtistEntity
import com.capi.music.models.MediaMetadata

val TvCardShape = RoundedCornerShape(18.dp)

val TvTextPrimary = Color(0xFFF4F4F6)
val TvTextSecondary = Color(0xFFACACB8)

@Composable
fun TvSectionTitle(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleLarge,
        fontWeight = FontWeight.SemiBold,
        color = TvTextPrimary,
        modifier = Modifier.padding(top = 18.dp, bottom = 8.dp),
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
    )
}

@Composable
fun <T> TvLazyRow(
    items: List<T>?,
    placeholderCount: Int = 0,
    key: (T) -> Any,
    content: @Composable (T) -> Unit,
) {
    val lazyListState = rememberLazyListState()
    var focusedIndex by remember { mutableStateOf<Int?>(null) }
    LaunchedEffect(focusedIndex) {
        focusedIndex?.let { index ->
            if (items != null && index in items.indices) {
                lazyListState.animateScrollToItem(index)
            }
        }
    }
    LazyRow(
        state = lazyListState,
        horizontalArrangement = Arrangement.spacedBy(20.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        if (items.isNullOrEmpty()) {
            items(placeholderCount) {
                Box(
                    Modifier
                        .padding(vertical = 6.dp)
                        .width(210.dp)
                        .aspectRatio(1f)
                        .clip(TvCardShape)
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)),
                )
            }
        } else {
            itemsIndexed(
                items = items,
                key = { _, item -> key(item) },
            ) { index, item ->
                Box(
                    Modifier
                        .padding(vertical = 6.dp, horizontal = 2.dp)
                        .onFocusChanged { if (it.isFocused) focusedIndex = index },
                ) {
                    content(item)
                }
            }
        }
    }
}

@Composable
fun <T> TvSectionRow(
    title: String,
    items: List<T>?,
    placeholderCount: Int = 0,
    key: (T) -> Any,
    content: @Composable (T) -> Unit,
) {
    if (items.isNullOrEmpty()) return
    Column {
        TvSectionTitle(title)
        TvLazyRow(items = items, placeholderCount = placeholderCount, key = key, content = content)
    }
}

@Composable
fun TvThumbnail(
    url: String?,
    modifier: Modifier,
    shape: Shape = TvCardShape,
    icon: ImageVector = Icons.Rounded.MusicNote,
) {
    if (url != null) {
        AsyncImage(
            model = url,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = modifier.clip(shape),
        )
    } else {
        Box(
            contentAlignment = Alignment.Center,
            modifier =
                modifier
                    .clip(shape)
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(40.dp),
            )
        }
    }
}

@Composable
fun TvEqualizer(
    playing: Boolean,
    color: Color,
    modifier: Modifier = Modifier,
) {
    val transition = rememberInfiniteTransition(label = "eq")
    val heights =
        listOf(
            transition.animateFloat(
                initialValue = 0.35f,
                targetValue = 1f,
                animationSpec = infiniteRepeatable(tween(380, easing = LinearEasing), RepeatMode.Reverse),
                label = "eq1",
            ),
            transition.animateFloat(
                initialValue = 1f,
                targetValue = 0.4f,
                animationSpec = infiniteRepeatable(tween(500, easing = LinearEasing), RepeatMode.Reverse),
                label = "eq2",
            ),
            transition.animateFloat(
                initialValue = 0.5f,
                targetValue = 0.9f,
                animationSpec = infiniteRepeatable(tween(430, easing = LinearEasing), RepeatMode.Reverse),
                label = "eq3",
            ),
        )
    Row(
        horizontalArrangement = Arrangement.spacedBy(3.dp),
        verticalAlignment = Alignment.Bottom,
        modifier = modifier.size(22.dp),
    ) {
        heights.forEach { bar ->
            val target = if (playing) bar.value else 0.35f
            Box(
                modifier =
                    Modifier
                        .width(4.dp)
                        .height((22.dp * target).coerceAtLeast(5.dp))
                        .clip(RoundedCornerShape(2.dp))
                        .background(color),
            )
        }
    }
}

@Composable
fun TvDownloadBadge(modifier: Modifier = Modifier) {
    Box(
        contentAlignment = Alignment.Center,
        modifier =
            modifier
                .size(26.dp)
                .clip(CircleShape)
                .background(Color.Black.copy(alpha = 0.55f)),
    ) {
        Icon(
            imageVector = Icons.Rounded.DownloadDone,
            contentDescription = null,
            tint = Color.White,
            modifier = Modifier.size(15.dp),
        )
    }
}

@Composable
fun TvCard(
    thumbnailUrl: String?,
    title: String,
    subtitle: String? = null,
    modifier: Modifier = Modifier,
    width: Dp = 210.dp,
    playing: Boolean = false,
    downloaded: Boolean = false,
    duration: String? = null,
    onClick: () -> Unit,
) {
    Column(
        horizontalAlignment = Alignment.Start,
        modifier =
            modifier
                .tvFocusable(shape = TvCardShape, onClick = onClick)
                .width(width),
    ) {
        Box {
            TvThumbnail(
                url = thumbnailUrl,
                modifier = Modifier.fillMaxWidth().aspectRatio(1f),
                shape = TvCardShape,
            )
            if (playing) {
                Box(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .aspectRatio(1f)
                            .clip(TvCardShape)
                            .background(Color.Black.copy(alpha = 0.30f)),
                )
                TvEqualizer(
                    playing = true,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.align(Alignment.Center),
                )
            }
            if (downloaded) {
                TvDownloadBadge(Modifier.align(Alignment.TopEnd).padding(8.dp))
            }
            if (duration != null) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier =
                        Modifier
                            .align(Alignment.BottomEnd)
                            .padding(8.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(Color.Black.copy(alpha = 0.55f))
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                ) {
                    Text(
                        text = duration,
                        style = MaterialTheme.typography.labelMedium,
                        color = Color.White,
                    )
                }
            }
        }
        Spacer(Modifier.height(10.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = if (playing) FontWeight.Bold else FontWeight.Medium,
            color = if (playing) MaterialTheme.colorScheme.primary else TvTextPrimary,
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

@Composable
fun TvSongCard(
    songTitle: String,
    artists: String?,
    thumbnailUrl: String?,
    modifier: Modifier = Modifier,
    playing: Boolean = false,
    downloaded: Boolean = false,
    onClick: () -> Unit,
    onLongClick: (() -> Unit)? = null,
) {
    Column(
        modifier =
            modifier.tvFocusable(
                shape = TvCardShape,
                onClick = onClick,
                onLongClick = onLongClick,
            ),
    ) {
        Box {
            TvThumbnail(
                url = thumbnailUrl,
                modifier = Modifier.width(280.dp).height(150.dp),
                shape = TvCardShape,
            )
            if (playing) {
                Box(
                    modifier =
                        Modifier
                            .width(280.dp)
                            .height(150.dp)
                            .clip(TvCardShape)
                            .background(Color.Black.copy(alpha = 0.30f)),
                )
                TvEqualizer(
                    playing = true,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.align(Alignment.Center),
                )
            }
            if (downloaded) {
                TvDownloadBadge(Modifier.align(Alignment.TopEnd).padding(8.dp))
            }
        }
        Spacer(Modifier.height(8.dp))
        Text(
            text = songTitle,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = if (playing) FontWeight.Bold else FontWeight.Medium,
            color = if (playing) MaterialTheme.colorScheme.primary else TvTextPrimary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.width(280.dp),
        )
        if (artists != null) {
            Text(
                text = artists,
                style = MaterialTheme.typography.bodyMedium,
                color = TvTextSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.width(280.dp),
            )
        }
    }
}

@Composable
fun TvButton(
    label: String,
    onClick: () -> Unit,
    filled: Boolean = false,
    modifier: Modifier = Modifier,
) {
    val container =
        if (filled) MaterialTheme.colorScheme.primary else Color(0xFF232329)
    val content =
        if (filled) Color(0xFF101014) else TvTextPrimary
    Box(
        contentAlignment = Alignment.Center,
        modifier =
            modifier
                .tvFocusable(shape = RoundedCornerShape(24.dp), onClick = onClick)
                .clip(RoundedCornerShape(24.dp))
                .background(container)
                .padding(horizontal = 28.dp, vertical = 12.dp),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Medium,
            color = content,
        )
    }
}

@Composable
fun TvIconButton(
    icon: ImageVector,
    contentDescription: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    active: Boolean = false,
    size: Dp = 56.dp,
) {
    var focused by remember { mutableStateOf(false) }
    val tint =
        when {
            active -> MaterialTheme.colorScheme.primary
            focused -> MaterialTheme.colorScheme.primary
            else -> TvTextSecondary
        }
    Box(
        contentAlignment = Alignment.Center,
        modifier =
            modifier
                .onFocusChanged { focused = it.isFocused || it.hasFocus }
                .then(
                    if (focused) {
                        Modifier.background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f), CircleShape)
                    } else {
                        Modifier
                    },
                )
                .tvFocusable(shape = CircleShape, onClick = onClick, scale = 1.10f)
                .size(size),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = tint,
            modifier = Modifier.size(size / 1.9f),
        )
    }
}

@Composable
fun TvPlayPauseButton(
    isPlaying: Boolean,
    onPlayPause: () -> Unit,
    modifier: Modifier = Modifier,
    size: Dp = 88.dp,
) {
    Box(
        contentAlignment = Alignment.Center,
        modifier =
            modifier
                .tvFocusable(
                    shape = CircleShape,
                    ringWidth = 3.dp,
                    onClick = onPlayPause,
                    scale = 1.08f,
                )
                .size(size)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary),
    ) {
        Icon(
            imageVector = if (isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onPrimary,
            modifier = Modifier.size(size * 0.58f),
        )
    }
}

@Composable
fun TvProgressBar(progress: Float) {
    LinearProgressIndicator(
        progress = { progress.coerceIn(0f, 1f) },
        modifier = Modifier.fillMaxWidth().height(4.dp),
        color = MaterialTheme.colorScheme.primary,
        trackColor = MaterialTheme.colorScheme.surfaceVariant,
    )
}

@Composable
fun TvSeekRow(
    positionMs: Long,
    durationMs: Long,
    onSeek: (Long) -> Unit,
    modifier: Modifier = Modifier,
    focusRequester: FocusRequester? = null,
) {
    val stepMs = 10_000L
    var position by remember(positionMs) { mutableStateOf(positionMs) }
    val progress =
        if (durationMs > 0) (position.toFloat() / durationMs).coerceIn(0f, 1f) else 0f

    Column(
        modifier =
            modifier
                .fillMaxWidth()
                .padding(vertical = 6.dp)
                .then(if (focusRequester != null) Modifier.focusRequester(focusRequester) else Modifier)
                .onKeyEvent { event ->
                    if (event.type == KeyEventType.KeyDown) {
                        when (event.key) {
                            Key.DirectionLeft -> {
                                position = (position - stepMs).coerceAtLeast(0)
                                onSeek(position)
                                true
                            }
                            Key.DirectionRight -> {
                                position = (position + stepMs).coerceAtMost(durationMs)
                                onSeek(position)
                                true
                            }
                            else -> false
                        }
                    } else false
                }
                .tvFocusable(
                    shape = RoundedCornerShape(16.dp),
                    ringWidth = 2.dp,
                    onClick = null,
                )
                .focusable(),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
        ) {
            Text(
                text = formatDurationMillis(position),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = formatDurationMillis(durationMs),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium,
                color = TvTextSecondary,
            )
        }
        BoxWithConstraints(
            modifier = Modifier.fillMaxWidth().height(28.dp),
        ) {
            val trackWidth = maxWidth
            Box(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .height(10.dp)
                        .align(Alignment.CenterStart)
                        .clip(RoundedCornerShape(5.dp))
                        .background(Color.White.copy(alpha = 0.14f)),
            )
            Box(
                modifier =
                    Modifier
                        .fillMaxWidth(progress)
                        .height(10.dp)
                        .align(Alignment.CenterStart)
                        .shadow(
                            elevation = 12.dp,
                            shape = RoundedCornerShape(5.dp),
                            spotColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f),
                        )
                        .clip(RoundedCornerShape(5.dp))
                        .background(
                            Brush.horizontalGradient(
                                listOf(
                                    MaterialTheme.colorScheme.primary,
                                    MaterialTheme.colorScheme.tertiary,
                                ),
                            ),
                        ),
            )
            Box(
                modifier =
                    Modifier
                        .align(Alignment.CenterStart)
                        .offset(x = (trackWidth * progress) - 15.dp)
                        .size(30.dp)
                        .shadow(10.dp, CircleShape, spotColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.7f))
                        .clip(CircleShape)
                        .background(Color.White)
                        .border(3.dp, MaterialTheme.colorScheme.primary, CircleShape),
            )
        }
    }
}

@Composable
fun TvEmptyState(title: String, subtitle: String? = null, modifier: Modifier = Modifier) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = modifier.fillMaxWidth().padding(vertical = 64.dp),
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.headlineSmall,
            color = TvTextPrimary,
        )
        if (subtitle != null) {
            Spacer(Modifier.height(6.dp))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyLarge,
                color = TvTextSecondary,
            )
        }
    }
}

@Composable
fun TvSearchBar(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier =
            modifier
                .fillMaxWidth()
                .tvFocusable(
                    shape = RoundedCornerShape(26.dp),
                    ringWidth = 2.dp,
                    onClick = onClick,
                )
                .clip(RoundedCornerShape(26.dp))
                .background(Color(0xFF232329), RoundedCornerShape(26.dp))
                .border(1.dp, Color.White.copy(alpha = 0.10f), RoundedCornerShape(26.dp))
                .padding(horizontal = 20.dp, vertical = 14.dp),
    ) {
        Icon(
            imageVector = Icons.Rounded.Search,
            contentDescription = null,
            tint = TvTextSecondary,
            modifier = Modifier.size(24.dp),
        )
        Spacer(Modifier.width(14.dp))
        Text(
            text = stringResource(R.string.search),
            style = MaterialTheme.typography.titleLarge,
            color = TvTextPrimary,
            modifier = Modifier.weight(1f),
        )
        Text(
            text = "YT Music",
            style = MaterialTheme.typography.labelLarge,
            color = TvTextSecondary,
            modifier = Modifier.padding(end = 4.dp),
        )
    }
}

@Composable
fun TvPlayingBadge(modifier: Modifier = Modifier) {
    TvEqualizer(
        playing = true,
        color = MaterialTheme.colorScheme.primary,
        modifier = modifier,
    )
}

fun formatDurationMillis(millis: Long): String {
    if (millis <= 0) return "0:00"
    val totalSeconds = millis / 1000
    return formatSeconds(totalSeconds.toInt())
}

fun formatSeconds(totalSeconds: Int): String {
    if (totalSeconds <= 0) return "0:00"
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60
    return if (hours > 0) {
        "%d:%02d:%02d".format(hours, minutes, seconds)
    } else {
        "%d:%02d".format(minutes, seconds)
    }
}

fun String?.tvFallback(): String? = this?.takeIf { it.isNotBlank() }

fun List<MediaMetadata.Artist>.tvPrimary(): String? = firstOrNull()?.name

fun List<ArtistEntity>.tvPrimaryLocal(): String? = firstOrNull()?.name

fun List<MediaMetadata.Artist>.tvJoined(): String = joinToString(", ") { it.name }

fun List<ArtistEntity>.tvJoinedLocal(): String = joinToString(", ") { it.name }