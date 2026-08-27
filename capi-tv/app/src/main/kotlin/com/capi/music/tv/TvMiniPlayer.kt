package com.capi.music.tv

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.QueueMusic
import androidx.compose.material.icons.rounded.Repeat
import androidx.compose.material.icons.rounded.RepeatOne
import androidx.compose.material.icons.rounded.Shuffle
import androidx.compose.material.icons.rounded.SkipNext
import androidx.compose.material.icons.rounded.SkipPrevious
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.media3.common.Player
import coil3.compose.AsyncImage
import com.capi.music.models.MediaMetadata
import com.capi.music.playback.PlayerConnection
import com.capi.music.tv.components.TvIconButton
import com.capi.music.tv.components.TvPlayPauseButton
import com.capi.music.tv.components.TvTextPrimary
import com.capi.music.tv.components.TvTextSecondary
import com.capi.music.tv.components.formatDurationMillis
import com.capi.music.tv.components.tvFocusable

private val PillShape = RoundedCornerShape(40.dp)

@Composable
fun TvMiniPlayer(
    playerConnection: PlayerConnection?,
    onExpand: () -> Unit,
    onOpenQueue: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val metadata by
        playerConnection?.mediaMetadata?.collectAsState()
            ?: remember { mutableStateOf<MediaMetadata?>(null) }
    val isPlaying by
        playerConnection?.isPlaying?.collectAsState() ?: remember { mutableStateOf(false) }
    val shuffleEnabled by playerConnection?.shuffleModeEnabled?.collectAsState() ?: remember { mutableStateOf(false) }
    val repeatMode by playerConnection?.repeatMode?.collectAsState() ?: remember { mutableStateOf(Player.REPEAT_MODE_OFF) }

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

    Box(
        modifier =
            modifier
                .fillMaxWidth()
                .padding(horizontal = 28.dp, vertical = 16.dp)
                .shadow(elevation = 22.dp, shape = PillShape)
                .clip(PillShape)
                .background(
                    Brush.horizontalGradient(
                        listOf(
                            Color(0xFF232329),
                            Color(0xFF2A2238),
                            Color(0xFF232329),
                        ),
                    ),
                )
                .border(1.dp, Color.White.copy(alpha = 0.12f), PillShape),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(18.dp),
            modifier = Modifier.padding(start = 22.dp, end = 18.dp, top = 14.dp, bottom = 18.dp),
        ) {
            AsyncImage(
                model = data.thumbnailUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier =
                    Modifier
                        .size(64.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .border(1.dp, Color.White.copy(alpha = 0.14f), RoundedCornerShape(14.dp)),
            )

            Column(
                verticalArrangement = Arrangement.Center,
                modifier =
                    Modifier
                        .weight(1f)
                        .tvFocusable(
                            shape = PillShape,
                            ringWidth = 2.dp,
                            onClick = onExpand,
                        )
                        .padding(horizontal = 8.dp),
            ) {
                Text(
                    text = data.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = TvTextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = data.artists.joinToString(", ") { it.name },
                    style = MaterialTheme.typography.bodyMedium,
                    color = TvTextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text =
                        "${formatDurationMillis(positionMs.longValue)} / ${formatDurationMillis(durationMs.longValue)}",
                    style = MaterialTheme.typography.labelMedium,
                    color = TvTextSecondary,
                )
            }

            TvIconButton(
                icon = Icons.Rounded.Shuffle,
                contentDescription = "",
                active = shuffleEnabled,
                size = 46.dp,
                onClick = {
                    player?.let { it.shuffleModeEnabled = !it.shuffleModeEnabled }
                },
            )
            TvIconButton(
                icon = Icons.Rounded.SkipPrevious,
                contentDescription = "",
                size = 46.dp,
                onClick = { playerConnection?.seekToPrevious() },
            )
            TvPlayPauseButton(
                isPlaying = isPlaying,
                onPlayPause = {
                    player?.let { it.playWhenReady = !it.playWhenReady }
                },
                size = 60.dp,
            )
            TvIconButton(
                icon = Icons.Rounded.SkipNext,
                contentDescription = "",
                size = 46.dp,
                onClick = { playerConnection?.seekToNext() },
            )
            TvIconButton(
                icon = if (repeatMode == Player.REPEAT_MODE_ONE) Icons.Rounded.RepeatOne else Icons.Rounded.Repeat,
                contentDescription = "",
                active = repeatMode != Player.REPEAT_MODE_OFF,
                size = 46.dp,
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
            TvIconButton(
                icon = Icons.Rounded.QueueMusic,
                contentDescription = "",
                size = 46.dp,
                onClick = onOpenQueue,
            )
        }

        LinearProgressIndicator(
            progress = {
                if (durationMs.longValue > 0) {
                    (positionMs.longValue.toFloat() / durationMs.longValue).coerceIn(0f, 1f)
                } else {
                    0f
                }
            },
            color = MaterialTheme.colorScheme.primary,
            trackColor = Color.White.copy(alpha = 0.10f),
            strokeCap = StrokeCap.Round,
            modifier =
                Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(horizontal = 22.dp)
                    .padding(bottom = 9.dp)
                    .height(3.dp)
                    .clip(CircleShape),
        )
    }
}