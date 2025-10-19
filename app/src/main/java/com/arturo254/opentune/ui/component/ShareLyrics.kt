package com.arturo254.opentune.ui.component

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.rememberAsyncImagePainter
import coil.request.ImageRequest
import com.arturo254.opentune.R
import com.arturo254.opentune.models.MediaMetadata
import kotlinx.coroutines.launch

// Estilos de letra
enum class FontStyle {
    REGULAR, BOLD, EXTRA_BOLD
}

// Posiciones del logo
enum class LogoPosition {
    BOTTOM_LEFT, BOTTOM_RIGHT, TOP_LEFT, TOP_RIGHT, NONE
}

// Estilos de fondo
enum class BackgroundStyle {
    SOLID, GRADIENT, PATTERN
}

// Configuración de personalización
data class ImageCustomization(
    val backgroundColor: Color = Color(0xFF0A0A0A),
    val textColor: Color = Color(0xFFFFFFFF),
    val secondaryTextColor: Color = Color(0xFFB0B0B0),
    val backgroundStyle: BackgroundStyle = BackgroundStyle.SOLID,
    val gradientColors: List<Color>? = null,
    val fontStyle: FontStyle = FontStyle.EXTRA_BOLD,
    val showCoverArt: Boolean = true,
    val showLogo: Boolean = true,
    val logoPosition: LogoPosition = LogoPosition.BOTTOM_LEFT,
    val patternOpacity: Float = 0.03f,
    val cornerRadius: Float = 28f,
    val isDark: Boolean = true
)

// Presets actualizados
data class ColorPreset(
    val name: String,
    val customization: ImageCustomization
)

val colorPresets = listOf(
    ColorPreset(
        "Oscuro Clásico",
        ImageCustomization(
            backgroundColor = Color(0xFF0A0A0A),
            textColor = Color(0xFFFFFFFF),
            secondaryTextColor = Color(0xFFB0B0B0),
            backgroundStyle = BackgroundStyle.SOLID,
            isDark = true
        )
    ),
    ColorPreset(
        "Azul Nocturno",
        ImageCustomization(
            backgroundColor = Color(0xFF0F172A),
            textColor = Color(0xFFF1F5F9),
            secondaryTextColor = Color(0xFF94A3B8),
            backgroundStyle = BackgroundStyle.GRADIENT,
            gradientColors = listOf(Color(0xFF0F172A), Color(0xFF1E3A8A)),
            isDark = true
        )
    ),
    ColorPreset(
        "Verde Esmeralda",
        ImageCustomization(
            backgroundColor = Color(0xFF064E3B),
            textColor = Color(0xFFECFDF5),
            secondaryTextColor = Color(0xFFA7F3D0),
            backgroundStyle = BackgroundStyle.PATTERN,
            isDark = true
        )
    ),
    ColorPreset(
        "Púrpura Profundo",
        ImageCustomization(
            backgroundColor = Color(0xFF4C1D95),
            textColor = Color(0xFFFAF5FF),
            secondaryTextColor = Color(0xFFDDD6FE),
            backgroundStyle = BackgroundStyle.GRADIENT,
            gradientColors = listOf(Color(0xFF4C1D95), Color(0xFF7C2D12)),
            isDark = true
        )
    ),
    ColorPreset(
        "Blanco Limpio",
        ImageCustomization(
            backgroundColor = Color(0xFFFFFFFF),
            textColor = Color(0xFF0F172A),
            secondaryTextColor = Color(0xFF64748B),
            backgroundStyle = BackgroundStyle.SOLID,
            isDark = false
        )
    ),
    ColorPreset(
        "Crema Suave",
        ImageCustomization(
            backgroundColor = Color(0xFFFEF7ED),
            textColor = Color(0xFF431407),
            secondaryTextColor = Color(0xFF78716C),
            backgroundStyle = BackgroundStyle.PATTERN,
            patternOpacity = 0.05f,
            isDark = false
        )
    ),
    ColorPreset(
        "Rosa Suave",
        ImageCustomization(
            backgroundColor = Color(0xFFFFF1F2),
            textColor = Color(0xFF881337),
            secondaryTextColor = Color(0xFFA21CAF),
            backgroundStyle = BackgroundStyle.GRADIENT,
            gradientColors = listOf(Color(0xFFFFF1F2), Color(0xFFFCE7F3)),
            isDark = false
        )
    ),
    ColorPreset(
        "Sunset",
        ImageCustomization(
            backgroundColor = Color(0xFFF0F9FF),
            textColor = Color(0xFF0C4A6E),
            secondaryTextColor = Color(0xFF0369A1),
            backgroundStyle = BackgroundStyle.GRADIENT,
            gradientColors = listOf(Color(0xFFFEF3C7), Color(0xFFFCA5A5), Color(0xFFC084FC)),
            isDark = false
        )
    ),
    ColorPreset(
        "Spotify Style",
        ImageCustomization(
            backgroundColor = Color(0xFF121212),
            textColor = Color(0xFF1DB954),
            secondaryTextColor = Color(0xFFFFFFFF),
            backgroundStyle = BackgroundStyle.GRADIENT,
            gradientColors = listOf(Color(0xFF121212), Color(0xFF1A1A1A)),
            fontStyle = FontStyle.BOLD,
            isDark = true
        )
    )
)

@Composable
fun rememberAdjustedFontSize(
    text: String,
    maxWidth: Dp,
    maxHeight: Dp,
    density: Density,
    initialFontSize: TextUnit = 20.sp,
    minFontSize: TextUnit = 14.sp,
    style: TextStyle = TextStyle.Default,
    textMeasurer: androidx.compose.ui.text.TextMeasurer? = null
): TextUnit {
    val measurer = textMeasurer ?: rememberTextMeasurer()

    var calculatedFontSize by remember(text, maxWidth, maxHeight, style, density) {
        val initialSize = when {
            text.length < 30 -> (initialFontSize.value * 1.1f).sp
            text.length < 60 -> initialFontSize
            text.length < 120 -> (initialFontSize.value * 0.85f).sp
            text.length < 200 -> (initialFontSize.value * 0.7f).sp
            else -> (initialFontSize.value * 0.6f).sp
        }
        mutableStateOf(initialSize)
    }

    LaunchedEffect(key1 = text, key2 = maxWidth, key3 = maxHeight) {
        val targetWidthPx = with(density) { maxWidth.toPx() * 0.85f }
        val targetHeightPx = with(density) { maxHeight.toPx() * 0.8f }

        if (text.isBlank()) {
            calculatedFontSize = minFontSize
            return@LaunchedEffect
        }

        var minSize = minFontSize.value
        var maxSize = (initialFontSize.value * 1.2f)
        var bestFit = minSize
        var iterations = 0

        while (minSize <= maxSize && iterations < 20) {
            iterations++
            val midSize = (minSize + maxSize) / 2
            val midSizeSp = midSize.sp

            val result = measurer.measure(
                text = AnnotatedString(text),
                style = style.copy(
                    fontSize = midSizeSp,
                    fontWeight = FontWeight.ExtraBold,
                    lineHeight = (midSize * 1.3f).sp,
                    letterSpacing = 0.3.sp
                )
            )

            if (result.size.width <= targetWidthPx && result.size.height <= targetHeightPx) {
                bestFit = midSize
                minSize = midSize + 0.5f
            } else {
                maxSize = midSize - 0.5f
            }
        }

        calculatedFontSize = if (bestFit < minFontSize.value) minFontSize else bestFit.sp
    }

    return calculatedFontSize
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LyricsImageCard(
    lyricText: String,
    mediaMetadata: MediaMetadata,
    selectedCustomization: ImageCustomization = ImageCustomization(),
    onCustomizationChange: (ImageCustomization) -> Unit = {},
    onSaveImage: () -> Unit = {},
    showControls: Boolean = true,
    modifier: Modifier = Modifier
) {
    var isGenerating by remember { mutableStateOf(false) }
    val context = LocalContext.current

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        if (showControls) {
            ModernControlsSection(
                selectedCustomization = selectedCustomization,
                isGenerating = isGenerating,
                onSaveImage = {
                    isGenerating = true
                    onSaveImage()
                    kotlinx.coroutines.GlobalScope.launch {
                        kotlinx.coroutines.delay(1500)
                        isGenerating = false
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        LyricsImageCardPreview(
            lyricText = lyricText,
            mediaMetadata = mediaMetadata,
            customization = selectedCustomization,
            modifier = Modifier
                .padding(horizontal = 20.dp)
                .fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(20.dp))

        Text(
            text = "La imagen se guardará en alta resolución",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ModernControlsSection(
    selectedCustomization: ImageCustomization,
    isGenerating: Boolean,
    onSaveImage: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        shape = RoundedCornerShape(20.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Compartir Letra",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            FloatingActionButton(
                onClick = onSaveImage,
                modifier = Modifier.size(48.dp),
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            ) {
                if (isGenerating) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Icon(
                        painter = painterResource(id = R.drawable.image),
                        contentDescription = "Guardar",
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun LyricsImageCardPreview(
    lyricText: String,
    mediaMetadata: MediaMetadata,
    customization: ImageCustomization = ImageCustomization(),
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val density = LocalDensity.current
    val cardSize = 380.dp
    val outerPadding = 32.dp
    val thumbnailSize = 80.dp

    val painter = rememberAsyncImagePainter(
        ImageRequest.Builder(context)
            .data(mediaMetadata.thumbnailUrl)
            .crossfade(true)
            .placeholder(R.drawable.music_note)
            .error(R.drawable.music_note)
            .build()
    )

    Box(
        modifier = modifier.fillMaxWidth(),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .size(cardSize)
                .shadow(
                    elevation = 24.dp,
                    shape = RoundedCornerShape(customization.cornerRadius.dp),
                    ambientColor = customization.textColor.copy(alpha = 0.3f),
                    spotColor = customization.textColor.copy(alpha = 0.5f)
                ),
            colors = CardDefaults.cardColors(containerColor = Color.Transparent),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
            shape = RoundedCornerShape(customization.cornerRadius.dp)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        brush = when (customization.backgroundStyle) {
                            BackgroundStyle.SOLID -> Brush.linearGradient(
                                listOf(
                                    customization.backgroundColor,
                                    customization.backgroundColor
                                )
                            )
                            BackgroundStyle.GRADIENT -> {
                                val colors = customization.gradientColors ?: listOf(
                                    customization.backgroundColor,
                                    customization.backgroundColor
                                )
                                Brush.linearGradient(
                                    colors = colors,
                                    start = Offset(0f, 0f),
                                    end = Offset(
                                        Float.POSITIVE_INFINITY,
                                        Float.POSITIVE_INFINITY
                                    )
                                )
                            }
                            BackgroundStyle.PATTERN -> Brush.linearGradient(
                                listOf(
                                    customization.backgroundColor,
                                    customization.backgroundColor
                                )
                            )
                        }
                    )
            ) {
                // Patrón de fondo
                if (customization.backgroundStyle == BackgroundStyle.PATTERN) {
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val pattern = 40.dp.toPx()
                        for (x in 0..size.width.toInt() step pattern.toInt()) {
                            for (y in 0..size.height.toInt() step pattern.toInt()) {
                                drawCircle(
                                    color = customization.textColor.copy(alpha = customization.patternOpacity),
                                    radius = 2.dp.toPx(),
                                    center = Offset(x.toFloat(), y.toFloat())
                                )
                            }
                        }
                    }
                }

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(outerPadding),
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    // Header: thumbnail, title, artist
                    if (customization.showCoverArt) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(thumbnailSize)
                                    .clip(RoundedCornerShape(20.dp))
                                    .background(customization.textColor.copy(alpha = 0.1f))
                                    .border(
                                        1.dp,
                                        customization.textColor.copy(alpha = 0.2f),
                                        RoundedCornerShape(20.dp)
                                    )
                            ) {
                                Image(
                                    painter = painter,
                                    contentDescription = null,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .clip(RoundedCornerShape(20.dp))
                                )
                            }

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = mediaMetadata.title,
                                    style = MaterialTheme.typography.headlineSmall.copy(
                                        fontSize = 20.sp,
                                        letterSpacing = (-0.5).sp
                                    ),
                                    fontWeight = when (customization.fontStyle) {
                                        FontStyle.REGULAR -> FontWeight.Bold
                                        FontStyle.BOLD -> FontWeight.ExtraBold
                                        FontStyle.EXTRA_BOLD -> FontWeight.Black
                                    },
                                    color = customization.textColor,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                    lineHeight = 24.sp
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = mediaMetadata.artists.joinToString { it.name },
                                    style = MaterialTheme.typography.bodyLarge.copy(
                                        fontSize = 16.sp,
                                        letterSpacing = 0.2.sp
                                    ),
                                    color = customization.secondaryTextColor,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    }

                    // Lyrics body
                    BoxWithConstraints(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                            .padding(vertical = 16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        val textMeasurer = rememberTextMeasurer()
                        val optimalFontSize = rememberAdjustedFontSize(
                            lyricText, maxWidth, maxHeight, density,
                            textMeasurer = textMeasurer
                        )

                        Text(
                            text = lyricText,
                            textAlign = TextAlign.Center,
                            fontSize = optimalFontSize,
                            fontWeight = when (customization.fontStyle) {
                                FontStyle.REGULAR -> FontWeight.Bold
                                FontStyle.BOLD -> FontWeight.ExtraBold
                                FontStyle.EXTRA_BOLD -> FontWeight.Black
                            },
                            color = customization.textColor,
                            lineHeight = optimalFontSize * 1.3f,
                            modifier = Modifier.fillMaxWidth(),
                            letterSpacing = 0.3.sp,
                            style = TextStyle(
                                shadow = Shadow(
                                    color = customization.backgroundColor.copy(alpha = 0.5f),
                                    offset = Offset(2f, 2f),
                                    blurRadius = 4f
                                )
                            )
                        )
                    }

                    // Footer con logo de la app
                    if (customization.showLogo) {
                        Box(
                            modifier = Modifier.fillMaxWidth(),
                            contentAlignment = when (customization.logoPosition) {
                                LogoPosition.BOTTOM_LEFT -> Alignment.CenterStart
                                LogoPosition.BOTTOM_RIGHT -> Alignment.CenterEnd
                                LogoPosition.TOP_LEFT -> Alignment.CenterStart
                                LogoPosition.TOP_RIGHT -> Alignment.CenterEnd
                                LogoPosition.NONE -> Alignment.CenterStart
                            }
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Card(
                                    modifier = Modifier.size(28.dp),
                                    shape = CircleShape,
                                    colors = CardDefaults.cardColors(containerColor = Color.Transparent)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(36.dp)
                                            .clip(CircleShape)
                                            .background(customization.textColor.copy(alpha = 0.15f))
                                            .border(
                                                1.dp,
                                                customization.textColor.copy(alpha = 0.3f),
                                                CircleShape
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Image(
                                            painter = painterResource(id = R.drawable.opentune),
                                            contentDescription = null,
                                            modifier = Modifier.size(20.dp),
                                        )
                                    }
                                }

                                Text(
                                    text = context.getString(R.string.app_name),
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = customization.secondaryTextColor,
                                    letterSpacing = 0.3.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ColorPresetSelector(
    selectedPreset: ColorPreset,
    onPresetChange: (ColorPreset) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyRow(
        modifier = modifier.padding(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(vertical = 8.dp)
    ) {
        items(colorPresets) { preset ->
            ColorPresetItem(
                preset = preset,
                isSelected = preset == selectedPreset,
                onClick = { onPresetChange(preset) }
            )
        }
    }
}

@Composable
private fun ColorPresetItem(
    preset: ColorPreset,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val scale by animateFloatAsState(
        targetValue = if (isSelected) 1.1f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy)
    )

    Column(
        modifier = modifier.clickable { onClick() },
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(60.dp)
                .scale(scale)
                .clip(RoundedCornerShape(16.dp))
                .background(
                    brush = if (preset.customization.backgroundStyle == BackgroundStyle.GRADIENT
                        && preset.customization.gradientColors != null) {
                        Brush.linearGradient(preset.customization.gradientColors)
                    } else {
                        Brush.linearGradient(
                            listOf(
                                preset.customization.backgroundColor,
                                preset.customization.backgroundColor
                            )
                        )
                    }
                )
                .border(
                    width = if (isSelected) 3.dp else 1.dp,
                    color = if (isSelected) MaterialTheme.colorScheme.primary else Color.Gray.copy(
                        alpha = 0.3f
                    ),
                    shape = RoundedCornerShape(16.dp)
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "Aa",
                color = preset.customization.textColor,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = preset.name,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurface.copy(
                alpha = if (isSelected) 1f else 0.7f
            ),
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}