package com.arturo254.opentune.ui.screens

import android.annotation.SuppressLint
import android.content.res.Configuration
import android.os.Build
import android.widget.Toast
import androidx.annotation.RequiresApi
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.add
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Velocity
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import coil.compose.AsyncImage
import com.arturo254.opentune.LocalPlayerConnection
import com.arturo254.opentune.R
import com.arturo254.opentune.constants.DarkModeKey
import com.arturo254.opentune.constants.LyricsClickKey
import com.arturo254.opentune.constants.LyricsTextPositionKey
import com.arturo254.opentune.constants.PlayerBackgroundStyle
import com.arturo254.opentune.constants.PlayerBackgroundStyleKey
import com.arturo254.opentune.db.entities.LyricsEntity.Companion.LYRICS_NOT_FOUND
import com.arturo254.opentune.lyrics.LyricsEntry
import com.arturo254.opentune.lyrics.LyricsEntry.Companion.HEAD_LYRICS_ENTRY
import com.arturo254.opentune.lyrics.LyricsUtils.findCurrentLineIndex
import com.arturo254.opentune.lyrics.LyricsUtils.parseLyrics
import com.arturo254.opentune.ui.component.LocalMenuState
import com.arturo254.opentune.ui.component.ShareLyricsDialog
import com.arturo254.opentune.ui.component.shimmer.ShimmerHost
import com.arturo254.opentune.ui.component.shimmer.TextPlaceholder
import com.arturo254.opentune.ui.menu.LyricsMenu
import com.arturo254.opentune.ui.screens.settings.DarkMode
import com.arturo254.opentune.ui.screens.settings.LyricsPosition
import com.arturo254.opentune.ui.utils.fadingEdge
import com.arturo254.opentune.utils.rememberEnumPreference
import com.arturo254.opentune.utils.rememberPreference
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.time.Duration.Companion.seconds

@RequiresApi(Build.VERSION_CODES.M)
@OptIn(ExperimentalFoundationApi::class)
@SuppressLint("UnusedBoxWithConstraintsScope", "StringFormatInvalid")
@Composable
fun FullScreenLyricsScreen(
    sliderPositionProvider: () -> Long?,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val playerConnection = LocalPlayerConnection.current ?: return
    val menuState = LocalMenuState.current
    val density = LocalDensity.current
    val context = LocalContext.current
    val configuration = LocalConfiguration.current

    val landscapeOffset = configuration.orientation == Configuration.ORIENTATION_LANDSCAPE
    val lyricsTextPosition by rememberEnumPreference(LyricsTextPositionKey, LyricsPosition.CENTER)
    val changeLyrics by rememberPreference(LyricsClickKey, true)
    val scope = rememberCoroutineScope()

    val mediaMetadata by playerConnection.mediaMetadata.collectAsState()
    val lyricsEntity by playerConnection.currentLyrics.collectAsState(initial = null)
    val lyrics = remember(lyricsEntity) { lyricsEntity?.lyrics?.trim() }

    val playerBackground by rememberEnumPreference(
        key = PlayerBackgroundStyleKey,
        defaultValue = PlayerBackgroundStyle.DEFAULT
    )

    val darkTheme by rememberEnumPreference(DarkModeKey, defaultValue = DarkMode.AUTO)
    val isSystemInDarkTheme = isSystemInDarkTheme()
    val useDarkTheme = remember(darkTheme, isSystemInDarkTheme) {
        if (darkTheme == DarkMode.AUTO) isSystemInDarkTheme else darkTheme == DarkMode.ON
    }

    val lines = remember(lyrics) {
        if (lyrics == null || lyrics == LYRICS_NOT_FOUND) {
            emptyList()
        } else if (lyrics.startsWith("[")) {
            listOf(HEAD_LYRICS_ENTRY) + parseLyrics(lyrics)
        } else {
            lyrics.lines().mapIndexed { index, line -> LyricsEntry(index * 100L, line) }
        }
    }
    
    val isSynced = remember(lyrics) {
        !lyrics.isNullOrEmpty() && lyrics.startsWith("[")
    }

    // Estados para la UI
    var currentLineIndex by remember { mutableIntStateOf(-1) }
    var deferredCurrentLineIndex by rememberSaveable { mutableIntStateOf(0) }
    var previousLineIndex by rememberSaveable { mutableIntStateOf(0) }
    var lastPreviewTime by rememberSaveable { mutableLongStateOf(0L) }
    var isSeeking by remember { mutableStateOf(false) }
    var initialScrollDone by rememberSaveable { mutableStateOf(false) }
    var shouldScrollToFirstLine by rememberSaveable { mutableStateOf(true) }
    var isAppMinimized by rememberSaveable { mutableStateOf(false) }
    
    // Estados para compartir
    var showShareDialog by remember { mutableStateOf(false) }
    var shareDialogData by remember { mutableStateOf<Triple<String, String, String>?>(null) }
    
    // Estados para selección múltiple
    var isSelectionModeActive by rememberSaveable { mutableStateOf(false) }
    val selectedIndices = remember { mutableStateListOf<Int>() }
    var showMaxSelectionToast by remember { mutableStateOf(false) }
    
    val lazyListState = rememberLazyListState()
    val maxSelectionLimit = 5

    // Colores para el texto
    val textColor = if (useDarkTheme) Color.White else Color.Black
    val backgroundColor = if (useDarkTheme) Color.Black else Color.White
    val highlightColor = MaterialTheme.colorScheme.primary

    // Toast para límite de selección
    LaunchedEffect(showMaxSelectionToast) {
        if (showMaxSelectionToast) {
            Toast.makeText(
                context,
                context.getString(R.string.max_selection_limit, maxSelectionLimit),
                Toast.LENGTH_SHORT
            ).show()
            showMaxSelectionToast = false
        }
    }

    // Observer del ciclo de vida
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_STOP) {
                val visibleItemsInfo = lazyListState.layoutInfo.visibleItemsInfo
                val isCurrentLineVisible = visibleItemsInfo.any { it.index == currentLineIndex }
                if (isCurrentLineVisible) {
                    initialScrollDone = false
                }
                isAppMinimized = true
            } else if (event == Lifecycle.Event.ON_START) {
                isAppMinimized = false
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    // Reset del modo selección cuando cambian las letras
    LaunchedEffect(lines) {
        isSelectionModeActive = false
        selectedIndices.clear()
    }

    // Actualización del índice de línea actual
    LaunchedEffect(lyrics) {
        if (lyrics.isNullOrEmpty() || !lyrics.startsWith("[")) {
            currentLineIndex = -1
            return@LaunchedEffect
        }
        while (isActive) {
            delay(50)
            val sliderPosition = sliderPositionProvider()
            isSeeking = sliderPosition != null
            currentLineIndex = findCurrentLineIndex(
                lines,
                sliderPosition ?: playerConnection.player.currentPosition
            )
        }
    }

    // Manejo de preview time
    LaunchedEffect(isSeeking, lastPreviewTime) {
        if (isSeeking) {
            lastPreviewTime = 0L
        } else if (lastPreviewTime != 0L) {
            delay(2.seconds)
            lastPreviewTime = 0L
        }
    }

    // Auto-scroll de las letras
    LaunchedEffect(currentLineIndex, lastPreviewTime, initialScrollDone) {
        fun countNewLine(str: String) = str.count { it == '\n' }
        
        fun calculateOffset() = with(density) {
            if (landscapeOffset) {
                16.dp.toPx().toInt() * countNewLine(lines[currentLineIndex].text)
            } else {
                20.dp.toPx().toInt() * countNewLine(lines[currentLineIndex].text)
            }
        }

        if (!isSynced) return@LaunchedEffect
        
        if ((currentLineIndex == 0 && shouldScrollToFirstLine) || !initialScrollDone) {
            shouldScrollToFirstLine = false
            lazyListState.scrollToItem(
                currentLineIndex,
                with(density) { 72.dp.toPx().toInt() } + calculateOffset()
            )
            if (!isAppMinimized) {
                initialScrollDone = true
            }
        } else if (currentLineIndex != -1) {
            deferredCurrentLineIndex = currentLineIndex
            if (isSeeking) {
                lazyListState.scrollToItem(
                    currentLineIndex,
                    with(density) { 72.dp.toPx().toInt() } + calculateOffset()
                )
            } else if (lastPreviewTime == 0L || currentLineIndex != previousLineIndex) {
                val visibleItemsInfo = lazyListState.layoutInfo.visibleItemsInfo
                val isCurrentLineVisible = visibleItemsInfo.any { it.index == currentLineIndex }

                if (isCurrentLineVisible) {
                    lazyListState.animateScrollToItem(
                        currentLineIndex,
                        with(density) { 72.dp.toPx().toInt() } + calculateOffset()
                    )
                }
            }
        }
        
        if (currentLineIndex > 0) {
            shouldScrollToFirstLine = true
        }
        previousLineIndex = currentLineIndex
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(backgroundColor)
    ) {
        // Fondo con imagen borrosa si está habilitado
        mediaMetadata?.let { metadata ->
            if (playerBackground == PlayerBackgroundStyle.BLUR) {
                AsyncImage(
                    model = metadata.thumbnailUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxSize()
                        .blur(50.dp)
                )
                
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.5f))
                )
            }
        }

        // Header con información de la canción y controles
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f)
            )
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
                    // Botón de regresar
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            painter = painterResource(R.drawable.arrow_back),
                            contentDescription = stringResource(R.string.back),
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    }

                    // Controles de selección
                    Row {
                        if (isSelectionModeActive) {
                            // Botón cancelar selección
                            IconButton(
                                onClick = {
                                    isSelectionModeActive = false
                                    selectedIndices.clear()
                                }
                            ) {
                                Icon(
                                    painter = painterResource(R.drawable.close),
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onSurface
                                )
                            }

                            // Botón compartir selección
                            IconButton(
                                onClick = {
                                    if (selectedIndices.isNotEmpty()) {
                                        val sortedIndices = selectedIndices.sorted()
                                        val selectedLyricsText = sortedIndices
                                            .mapNotNull { lines.getOrNull(it)?.text }
                                            .joinToString("\n")

                                        if (selectedLyricsText.isNotBlank()) {
                                            shareDialogData = Triple(
                                                selectedLyricsText,
                                                mediaMetadata?.title ?: "",
                                                mediaMetadata?.artists?.joinToString { it.name } ?: ""
                                            )
                                            showShareDialog = true
                                        }
                                        isSelectionModeActive = false
                                        selectedIndices.clear()
                                    }
                                },
                                enabled = selectedIndices.isNotEmpty()
                            ) {
                                Icon(
                                    painter = painterResource(R.drawable.media3_icon_share),
                                    contentDescription = stringResource(R.string.share_selected),
                                    tint = if (selectedIndices.isNotEmpty()) 
                                        MaterialTheme.colorScheme.onSurface 
                                    else 
                                        MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                                )
                            }
                        } else {
                            // Botón menú
                            IconButton(
                                onClick = {
                                    mediaMetadata?.let { metadata ->
                                        menuState.show {
                                            LyricsMenu(
                                                lyricsProvider = { lyricsEntity },
                                                mediaMetadataProvider = { metadata },
                                                onDismiss = menuState::dismiss
                                            )
                                        }
                                    }
                                }
                            )
                            {
                                Icon(
                                    painter = painterResource(R.drawable.more_horiz),
                                    contentDescription = stringResource(R.string.more_options),
                                    tint = MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    }
                }

                // Información de la canción
                mediaMetadata?.let { metadata ->
                    Spacer(Modifier.height(8.dp))
                    
                    AnimatedContent(
                        targetState = metadata.title,
                        transitionSpec = { fadeIn() togetherWith fadeOut() },
                        label = "title"
                    ) { title ->
                        Text(
                            text = title,
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 2
                        )
                    }
                    
                    Spacer(Modifier.height(4.dp))
                    
                    Text(
                        text = metadata.artists.joinToString { it.name },
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                        maxLines = 1
                    )
                }
            }
        }

        // Lista de letras
        BoxWithConstraints(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 140.dp)
        ) {
            LazyColumn(
                state = lazyListState,
                contentPadding = WindowInsets.systemBars
                    .only(WindowInsetsSides.Bottom)
                    .add(WindowInsets(top = maxHeight / 6, bottom = maxHeight / 6))
                    .asPaddingValues(),
                modifier = Modifier
                    .fadingEdge(vertical = 64.dp)
                    .nestedScroll(remember {
                        object : NestedScrollConnection {
                            override fun onPostScroll(
                                consumed: Offset,
                                available: Offset,
                                source: NestedScrollSource
                            ): Offset {
                                if (!isSelectionModeActive) {
                                    lastPreviewTime = System.currentTimeMillis()
                                }
                                return super.onPostScroll(consumed, available, source)
                            }

                            override suspend fun onPostFling(
                                consumed: Velocity,
                                available: Velocity
                            ): Velocity {
                                if (!isSelectionModeActive) {
                                    lastPreviewTime = System.currentTimeMillis()
                                }
                                return super.onPostFling(consumed, available)
                            }
                        }
                    })
            ) {
                val displayedCurrentLineIndex =
                    if (isSeeking || isSelectionModeActive) deferredCurrentLineIndex else currentLineIndex

                if (lyrics == null) {
                    item {
                        ShimmerHost {
                            repeat(10) {
                                Box(
                                    contentAlignment = when (lyricsTextPosition) {
                                        LyricsPosition.LEFT -> Alignment.CenterStart
                                        LyricsPosition.CENTER -> Alignment.Center
                                        LyricsPosition.RIGHT -> Alignment.CenterEnd
                                    },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 32.dp, vertical = 8.dp)
                                ) {
                                    TextPlaceholder()
                                }
                            }
                        }
                    }
                } else {
                    itemsIndexed(
                        items = lines,
                        key = { index, item -> "$index-${item.time}" }
                    ) { index, item ->
                        val isSelected = selectedIndices.contains(index)
                        val isCurrentLine = index == displayedCurrentLineIndex && isSynced
                        
                        val itemModifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .combinedClickable(
                                enabled = true,
                                onClick = {
                                    if (isSelectionModeActive) {
                                        if (isSelected) {
                                            selectedIndices.remove(index)
                                            if (selectedIndices.isEmpty()) {
                                                isSelectionModeActive = false
                                            }
                                        } else {
                                            if (selectedIndices.size < maxSelectionLimit) {
                                                selectedIndices.add(index)
                                            } else {
                                                showMaxSelectionToast = true
                                            }
                                        }
                                    } else if (isSynced && changeLyrics) {
                                        playerConnection.player.seekTo(item.time)
                                        scope.launch {
                                            lazyListState.animateScrollToItem(
                                                index,
                                                with(density) { 72.dp.toPx().toInt() } +
                                                        with(density) {
                                                            val count = item.text.count { it == '\n' }
                                                            (if (landscapeOffset) 16.dp.toPx() else 20.dp.toPx()).toInt() * count
                                                        }
                                            )
                                        }
                                        lastPreviewTime = 0L
                                    }
                                },
                                onLongClick = {
                                    if (!isSelectionModeActive) {
                                        isSelectionModeActive = true
                                        selectedIndices.add(index)
                                    } else if (!isSelected && selectedIndices.size < maxSelectionLimit) {
                                        selectedIndices.add(index)
                                    } else if (!isSelected) {
                                        showMaxSelectionToast = true
                                    }
                                }
                            )
                            .background(
                                when {
                                    isSelected && isSelectionModeActive -> 
                                        highlightColor.copy(alpha = 0.3f)
                                    isCurrentLine -> 
                                        highlightColor.copy(alpha = 0.1f)
                                    else -> Color.Transparent
                                }
                            )
                            .padding(horizontal = 32.dp, vertical = 12.dp)
                            .alpha(
                                when {
                                    !isSynced -> 1f
                                    isCurrentLine -> 1f
                                    isSelectionModeActive && isSelected -> 1f
                                    else -> 0.6f
                                }
                            )

                        Text(
                            text = item.text,
                            fontSize = if (isCurrentLine) 26.sp else 22.sp,
                            color = if (isCurrentLine) highlightColor else textColor,
                            textAlign = when (lyricsTextPosition) {
                                LyricsPosition.LEFT -> TextAlign.Left
                                LyricsPosition.CENTER -> TextAlign.Center
                                LyricsPosition.RIGHT -> TextAlign.Right
                            },
                            fontWeight = if (isCurrentLine) FontWeight.Bold else FontWeight.Normal,
                            lineHeight = if (isCurrentLine) 32.sp else 28.sp,
                            modifier = itemModifier
                        )
                    }
                }
            }

            // Mensaje cuando no se encuentran letras
            if (lyrics == LYRICS_NOT_FOUND) {
                Text(
                    text = stringResource(R.string.lyrics_not_found),
                    fontSize = 24.sp,
                    color = textColor.copy(alpha = 0.7f),
                    textAlign = TextAlign.Center,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 32.dp)
                )
            }
        }
    }

    // Diálogo para compartir
    if (showShareDialog && shareDialogData != null) {
        val (lyricsText, songTitle, artists) = shareDialogData!!
        ShareLyricsDialog(
            lyricsText = lyricsText,
            songTitle = songTitle,
            artists = artists,
            mediaMetadata = mediaMetadata,
            onDismiss = { showShareDialog = false }
        )
    }
}