package com.capi.music.tv.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun Modifier.tvFocusable(
    shape: Shape,
    enabled: Boolean = true,
    ringWidth: Dp = 2.dp,
    ringColor: Color = MaterialTheme.colorScheme.primary,
    scale: Float = 1.06f,
    onClick: (() -> Unit)? = null,
    onLongClick: (() -> Unit)? = null,
): Modifier {
    var focused by remember { mutableStateOf(false) }
    val animatedScale by
        animateFloatAsState(
            targetValue = if (focused && enabled) scale else 1f,
            animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
            label = "tv-scale",
        )
    val hasFocus = focused && enabled

    return this
        .graphicsLayer {
            scaleX = animatedScale
            scaleY = animatedScale
        }
        .onFocusChanged { focused = it.isFocused || it.hasFocus }
        .then(
            if (hasFocus) {
                Modifier
                    .shadow(
                        elevation = 14.dp,
                        shape = shape,
                        clip = false,
                        ambientColor = Color.Black.copy(alpha = 0.45f),
                        spotColor = ringColor.copy(alpha = 0.30f),
                    )
                    .background(ringColor.copy(alpha = 0.10f), shape)
                    .border(ringWidth, ringColor.copy(alpha = 0.85f), shape)
            } else {
                Modifier.background(Color.Transparent, shape)
            },
        )
        .clip(shape)
        .then(
            when {
                onClick != null && onLongClick != null ->
                    Modifier.combinedClickable(
                        enabled = enabled,
                        onClick = { onClick() },
                        onLongClick = { onLongClick() },
                    )

                onClick != null -> Modifier.clickable(enabled = enabled) { onClick() }
                onLongClick != null ->
                    Modifier.combinedClickable(
                        enabled = enabled,
                        onClick = {},
                        onLongClick = { onLongClick() },
                    )

                else -> Modifier
            },
        )
}