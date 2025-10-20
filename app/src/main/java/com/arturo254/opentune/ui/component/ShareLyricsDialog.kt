package com.arturo254.opentune.ui.component

import android.content.Intent
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SheetValue
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.graphics.drawable.toBitmap
import androidx.palette.graphics.Palette
import coil.ImageLoader
import coil.request.ImageRequest
import com.arturo254.opentune.R
import com.arturo254.opentune.models.MediaMetadata
import com.arturo254.opentune.utils.ComposeToImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShareLyricsDialog(
    lyricsText: String,
    songTitle: String,
    artists: String,
    mediaMetadata: MediaMetadata?,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sheetState = rememberModalBottomSheetState(
        skipPartiallyExpanded = true,
        confirmValueChange = { it != SheetValue.Hidden }
    )

    var showColorPickerSheet by remember { mutableStateOf(false) }
    var showProgressDialog by remember { mutableStateOf(false) }

    if (!showColorPickerSheet) {
        ModalBottomSheet(
            onDismissRequest = onDismiss,
            sheetState = sheetState,
            dragHandle = { BottomSheetDefaults.DragHandle() },
            shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .background(
                                    color = MaterialTheme.colorScheme.primaryContainer,
                                    shape = CircleShape
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                painter = painterResource(id = R.drawable.media3_icon_share),
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onPrimaryContainer,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Text(
                            text = stringResource(R.string.share_lyrics),
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }

                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            painter = painterResource(id = R.drawable.close),
                            contentDescription = stringResource(R.string.cancel),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "$songTitle • $artists",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Button(
                        onClick = {
                            val shareIntent = Intent().apply {
                                action = Intent.ACTION_SEND
                                type = "text/plain"
                                val songLink =
                                    "https://music.youtube.com/watch?v=${mediaMetadata?.id}"
                                putExtra(
                                    Intent.EXTRA_TEXT,
                                    "\"$lyricsText\"\n\n$songTitle - $artists\n$songLink"
                                )
                            }
                            context.startActivity(
                                Intent.createChooser(
                                    shareIntent,
                                    context.getString(R.string.share_lyrics)
                                )
                            )
                            onDismiss()
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary
                        )
                    ) {
                        Icon(
                            painter = painterResource(id = R.drawable.media3_icon_share),
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = stringResource(R.string.share_as_text),
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    OutlinedButton(
                        onClick = {
                            showColorPickerSheet = true
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(
                            width = 1.5.dp,
                            color = MaterialTheme.colorScheme.outline
                        ),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = MaterialTheme.colorScheme.onSurface
                        )
                    ) {
                        Icon(
                            painter = painterResource(id = R.drawable.image),
                            contentDescription = null,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = stringResource(R.string.share_as_image),
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = stringResource(R.string.cancel),
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }

    if (showColorPickerSheet) {
        ShareLyricsImageCustomizationSheet(
            lyricsText = lyricsText,
            songTitle = songTitle,
            artists = artists,
            mediaMetadata = mediaMetadata,
            onDismiss = {
                showColorPickerSheet = false
                onDismiss()
            },
            onBack = { showColorPickerSheet = false },
            showProgressDialog = showProgressDialog,
            onShowProgressDialog = { showProgressDialog = it }
        )
    }

    if (showProgressDialog) {
        ModalBottomSheet(
            onDismissRequest = { },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    CircularProgressIndicator(
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = stringResource(R.string.generating_image) + "\n" + stringResource(R.string.please_wait),
                        color = MaterialTheme.colorScheme.onSurface,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShareLyricsImageCustomizationSheet(
    lyricsText: String,
    songTitle: String,
    artists: String,
    mediaMetadata: MediaMetadata?,
    onDismiss: () -> Unit,
    onBack: () -> Unit,
    showProgressDialog: Boolean,
    onShowProgressDialog: (Boolean) -> Unit
) {
    val context = LocalContext.current
    val configuration = LocalConfiguration.current
    val density = LocalDensity.current
    val scope = rememberCoroutineScope()
    val coverUrl = mediaMetadata?.thumbnailUrl
    val paletteColors = remember { mutableStateListOf<Color>() }

    var selectedCustomization by remember { mutableStateOf(colorPresets[0].customization) }
    var isPresetSelectorExpanded by remember { mutableStateOf(false) }
    var isAdvancedSettingsExpanded by remember { mutableStateOf(false) }

    LaunchedEffect(coverUrl) {
        if (coverUrl != null) {
            withContext(Dispatchers.IO) {
                try {
                    val loader = ImageLoader(context)
                    val req = ImageRequest.Builder(context)
                        .data(coverUrl)
                        .allowHardware(false)
                        .build()

                    val drawable = loader.execute(req).drawable
                    if (drawable != null) {
                        val bitmap = drawable.toBitmap()
                        val palette = Palette.from(bitmap).generate()
                        val colors = listOfNotNull(
                            palette.getLightVibrantColor(Color.Black.toArgb())
                                .takeIf { it != Color.Black.toArgb() },
                            palette.getVibrantColor(Color.Black.toArgb())
                                .takeIf { it != Color.Black.toArgb() },
                            palette.getDarkVibrantColor(Color.Black.toArgb())
                                .takeIf { it != Color.Black.toArgb() },
                            palette.getLightMutedColor(Color.Black.toArgb())
                                .takeIf { it != Color.Black.toArgb() },
                            palette.getMutedColor(Color.Black.toArgb())
                                .takeIf { it != Color.Black.toArgb() },
                            palette.getDarkMutedColor(Color.Black.toArgb())
                                .takeIf { it != Color.Black.toArgb() }
                        ).map { Color(it) }.distinct()

                        if (colors.isNotEmpty()) {
                            paletteColors.clear()
                            paletteColors.addAll(colors)
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        dragHandle = { BottomSheetDefaults.DragHandle() },
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            painter = painterResource(id = R.drawable.arrow_back),
                            contentDescription = stringResource(R.string.back),
                            tint = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    Text(
                        text = stringResource(R.string.customize_image),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.close),
                        contentDescription = stringResource(R.string.cancel),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainer
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = stringResource(R.string.select_theme),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        IconButton(
                            onClick = { isPresetSelectorExpanded = !isPresetSelectorExpanded },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                imageVector = if (isPresetSelectorExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                contentDescription = if (isPresetSelectorExpanded) stringResource(R.string.collapse) else stringResource(
                                    R.string.expand
                                ),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    AnimatedVisibility(
                        visible = isPresetSelectorExpanded,
                        enter = slideInVertically() + fadeIn(),
                        exit = slideOutVertically() + fadeOut()
                    ) {
                        Column(
                            modifier = Modifier.padding(top = 16.dp)
                        ) {
                            if (paletteColors.isNotEmpty()) {
                                Text(
                                    text = stringResource(R.string.from_cover),
                                    style = MaterialTheme.typography.labelLarge,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(bottom = 8.dp)
                                )
                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    modifier = Modifier.padding(bottom = 16.dp)
                                ) {
                                    items(paletteColors) { color ->
                                        val customization = ImageCustomization(
                                            backgroundColor = color,
                                            textColor = if (color.isDark()) Color.White else Color.Black,
                                            secondaryTextColor = if (color.isDark()) Color.White.copy(
                                                alpha = 0.7f
                                            ) else Color.Black.copy(alpha = 0.7f),
                                            isDark = color.isDark()
                                        )
                                        BottomSheetColorCustomizationItem(
                                            customization = customization,
                                            presetName = stringResource(R.string.cover_color),
                                            isSelected = selectedCustomization == customization,
                                            onClick = { selectedCustomization = customization }
                                        )
                                    }
                                }
                            }

                            Text(
                                text = stringResource(R.string.presets),
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                items(colorPresets) { preset ->
                                    BottomSheetColorCustomizationItem(
                                        customization = preset.customization,
                                        presetName = preset.name,
                                        isSelected = selectedCustomization.backgroundColor == preset.customization.backgroundColor,
                                        onClick = { selectedCustomization = preset.customization }
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainer
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Configuración Avanzada",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        IconButton(
                            onClick = { isAdvancedSettingsExpanded = !isAdvancedSettingsExpanded },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                imageVector = if (isAdvancedSettingsExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    AnimatedVisibility(
                        visible = isAdvancedSettingsExpanded,
                        enter = slideInVertically() + fadeIn(),
                        exit = slideOutVertically() + fadeOut()
                    ) {
                        Column(
                            modifier = Modifier.padding(top = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Estilo de Fondo",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    FilterChip(
                                        selected = selectedCustomization.backgroundStyle == BackgroundStyle.SOLID,
                                        onClick = {
                                            selectedCustomization = selectedCustomization.copy(
                                                backgroundStyle = BackgroundStyle.SOLID
                                            )
                                        },
                                        label = { Text("Sólido") }
                                    )
                                    FilterChip(
                                        selected = selectedCustomization.backgroundStyle == BackgroundStyle.GRADIENT,
                                        onClick = {
                                            selectedCustomization = selectedCustomization.copy(
                                                backgroundStyle = BackgroundStyle.GRADIENT
                                            )
                                        },
                                        label = { Text("Gradiente") }
                                    )
                                    FilterChip(
                                        selected = selectedCustomization.backgroundStyle == BackgroundStyle.PATTERN,
                                        onClick = {
                                            selectedCustomization = selectedCustomization.copy(
                                                backgroundStyle = BackgroundStyle.PATTERN
                                            )
                                        },
                                        label = { Text("Patrón") }
                                    )
                                }
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Estilo de Fuente",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    FilterChip(
                                        selected = selectedCustomization.fontStyle == FontStyle.REGULAR,
                                        onClick = {
                                            selectedCustomization = selectedCustomization.copy(
                                                fontStyle = FontStyle.REGULAR
                                            )
                                        },
                                        label = { Text("Normal") }
                                    )
                                    FilterChip(
                                        selected = selectedCustomization.fontStyle == FontStyle.BOLD,
                                        onClick = {
                                            selectedCustomization = selectedCustomization.copy(
                                                fontStyle = FontStyle.BOLD
                                            )
                                        },
                                        label = { Text("Negrita") }
                                    )
                                    FilterChip(
                                        selected = selectedCustomization.fontStyle == FontStyle.EXTRA_BOLD,
                                        onClick = {
                                            selectedCustomization = selectedCustomization.copy(
                                                fontStyle = FontStyle.EXTRA_BOLD
                                            )
                                        },
                                        label = { Text("Extra") }
                                    )
                                }
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Mostrar Carátula",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Switch(
                                    checked = selectedCustomization.showCoverArt,
                                    onCheckedChange = {
                                        selectedCustomization = selectedCustomization.copy(
                                            showCoverArt = it
                                        )
                                    }
                                )
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Mostrar Logo",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Switch(
                                    checked = selectedCustomization.showLogo,
                                    onCheckedChange = {
                                        selectedCustomization = selectedCustomization.copy(
                                            showLogo = it
                                        )
                                    }
                                )
                            }

                            if (selectedCustomization.showLogo) {
                                Column {
                                    Text(
                                        text = "Posición del Logo",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurface,
                                        modifier = Modifier.padding(bottom = 8.dp)
                                    )
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        FilterChip(
                                            selected = selectedCustomization.logoPosition == LogoPosition.BOTTOM_LEFT,
                                            onClick = {
                                                selectedCustomization = selectedCustomization.copy(
                                                    logoPosition = LogoPosition.BOTTOM_LEFT
                                                )
                                            },
                                            label = { Text("Abajo Izq.") },
                                            modifier = Modifier.weight(1f)
                                        )
                                        FilterChip(
                                            selected = selectedCustomization.logoPosition == LogoPosition.BOTTOM_RIGHT,
                                            onClick = {
                                                selectedCustomization = selectedCustomization.copy(
                                                    logoPosition = LogoPosition.BOTTOM_RIGHT
                                                )
                                            },
                                            label = { Text("Abajo Der.") },
                                            modifier = Modifier.weight(1f)
                                        )
                                    }
                                }
                            }

                            Column {
                                Text(
                                    text = "Radio de Esquinas: ${selectedCustomization.cornerRadius.toInt()}dp",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    modifier = Modifier.padding(bottom = 8.dp)
                                )
                                Slider(
                                    value = selectedCustomization.cornerRadius,
                                    onValueChange = {
                                        selectedCustomization = selectedCustomization.copy(
                                            cornerRadius = it
                                        )
                                    },
                                    valueRange = 0f..40f,
                                    steps = 39
                                )
                            }

                            if (selectedCustomization.backgroundStyle == BackgroundStyle.PATTERN) {
                                Column {
                                    Text(
                                        text = "Opacidad del Patrón: ${(selectedCustomization.patternOpacity * 100).toInt()}%",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurface,
                                        modifier = Modifier.padding(bottom = 8.dp)
                                    )
                                    Slider(
                                        value = selectedCustomization.patternOpacity,
                                        onValueChange = {
                                            selectedCustomization = selectedCustomization.copy(
                                                patternOpacity = it
                                            )
                                        },
                                        valueRange = 0.01f..0.15f
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = stringResource(R.string.preview),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(horizontal = 24.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
                contentAlignment = Alignment.Center
            ) {
                if (mediaMetadata != null) {
                    LyricsImageCardPreview(
                        lyricText = lyricsText,
                        mediaMetadata = mediaMetadata,
                        customization = selectedCustomization,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = onBack,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        text = stringResource(R.string.back),
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Medium
                    )
                }

                Button(
                    onClick = {
                        scope.launch {
                            onShowProgressDialog(true)
                            try {
                                val screenWidth = configuration.screenWidthDp
                                val screenHeight = configuration.screenHeightDp

                                val image = ComposeToImage.createLyricsImage(
                                    context = context,
                                    coverArtUrl = coverUrl,
                                    songTitle = songTitle,
                                    artistName = artists,
                                    lyrics = lyricsText,
                                    width = (screenWidth * density.density).toInt(),
                                    height = (screenHeight * density.density).toInt(),
                                    backgroundColor = selectedCustomization.backgroundColor.toArgb(),
                                    textColor = selectedCustomization.textColor.toArgb(),
                                    secondaryTextColor = selectedCustomization.secondaryTextColor.toArgb(),
                                    showCoverArt = selectedCustomization.showCoverArt,
                                    showLogo = selectedCustomization.showLogo,
                                    backgroundStyle = selectedCustomization.backgroundStyle.name,
                                    gradientColors = selectedCustomization.gradientColors?.map { it.toArgb() }
                                        ?.toIntArray(),
                                    fontStyle = selectedCustomization.fontStyle.name,
                                    logoPosition = selectedCustomization.logoPosition.name,
                                    cornerRadius = selectedCustomization.cornerRadius,
                                    patternOpacity = selectedCustomization.patternOpacity
                                )

                                val timestamp = System.currentTimeMillis()
                                val filename = "lyrics_$timestamp"
                                val uri = ComposeToImage.saveBitmapAsFile(
                                    context,
                                    image,
                                    filename
                                )

                                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                    type = "image/png"
                                    putExtra(Intent.EXTRA_STREAM, uri)
                                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                }

                                context.startActivity(
                                    Intent.createChooser(shareIntent, "Share Lyrics")
                                )

                                onShowProgressDialog(false)
                                onDismiss()

                            } catch (e: Exception) {
                                Toast.makeText(
                                    context,
                                    "Failed to create image: ${e.message}",
                                    Toast.LENGTH_SHORT
                                ).show()
                                onShowProgressDialog(false)
                            }
                        }
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary
                    )
                ) {
                    Text(
                        text = stringResource(R.string.share_lyrics_image),
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

fun Color.isDark(): Boolean {
    val luminance = 0.299f * this.red + 0.587f * this.green + 0.114f * this.blue
    return luminance < 0.5f
}

@Composable
fun BottomSheetColorCustomizationItem(
    customization: ImageCustomization,
    presetName: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val scale by animateFloatAsState(
        targetValue = if (isSelected) 1.1f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy)
    )

    Column(
        modifier = modifier
            .width(60.dp)
            .clickable { onClick() },
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .scale(scale)
                .clip(RoundedCornerShape(12.dp))
                .background(
                    brush = if (customization.backgroundStyle == BackgroundStyle.GRADIENT
                        && customization.gradientColors != null
                    ) {
                        Brush.linearGradient(customization.gradientColors)
                    } else {
                        Brush.linearGradient(
                            listOf(
                                customization.backgroundColor,
                                customization.backgroundColor
                            )
                        )
                    }
                )
                .border(
                    width = if (isSelected) 2.dp else 1.dp,
                    color = if (isSelected) MaterialTheme.colorScheme.primary else Color.Gray.copy(
                        alpha = 0.3f
                    ),
                    shape = RoundedCornerShape(12.dp)
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "Aa",
                color = customization.textColor,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = presetName,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurface.copy(
                alpha = if (isSelected) 1f else 0.7f
            ),
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
            fontSize = 10.sp
        )
    }
}