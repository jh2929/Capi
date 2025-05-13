package com.arturo254.opentune.ui.screens.settings

import android.content.Context
import android.net.Uri
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarScrollBehavior
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import androidx.navigation.NavController
import coil.compose.rememberAsyncImagePainter
import coil.request.ImageRequest
import com.arturo254.opentune.LocalPlayerAwareWindowInsets
import com.arturo254.opentune.R
import com.arturo254.opentune.constants.ChipSortTypeKey
import com.arturo254.opentune.constants.DarkModeKey
import com.arturo254.opentune.constants.DefaultOpenTabKey
import com.arturo254.opentune.constants.DynamicThemeKey
import com.arturo254.opentune.constants.GridItemSize
import com.arturo254.opentune.constants.GridItemsSizeKey
import com.arturo254.opentune.constants.LibraryFilter
import com.arturo254.opentune.constants.LyricsClickKey
import com.arturo254.opentune.constants.LyricsTextPositionKey
import com.arturo254.opentune.constants.PlayerBackgroundStyle
import com.arturo254.opentune.constants.PlayerBackgroundStyleKey
import com.arturo254.opentune.constants.PlayerButtonsStyle
import com.arturo254.opentune.constants.PlayerButtonsStyleKey
import com.arturo254.opentune.constants.PlayerTextAlignmentKey
import com.arturo254.opentune.constants.PureBlackKey
import com.arturo254.opentune.constants.SliderStyle
import com.arturo254.opentune.constants.SliderStyleKey
import com.arturo254.opentune.constants.SlimNavBarKey
import com.arturo254.opentune.constants.SwipeThumbnailKey
import com.arturo254.opentune.ui.component.DefaultDialog
import com.arturo254.opentune.ui.component.EnumListPreference
import com.arturo254.opentune.ui.component.IconButton
import com.arturo254.opentune.ui.component.ListPreference
import com.arturo254.opentune.ui.component.PlayerSliderTrack
import com.arturo254.opentune.ui.component.PreferenceEntry
import com.arturo254.opentune.ui.component.PreferenceGroupTitle
import com.arturo254.opentune.ui.component.SwitchPreference
import com.arturo254.opentune.ui.utils.backToMain
import com.arturo254.opentune.utils.rememberEnumPreference
import com.arturo254.opentune.utils.rememberPreference
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import me.saket.squiggles.SquigglySlider
import timber.log.Timber
import java.io.File
import java.io.FileOutputStream
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppearanceSettings(
    navController: NavController,
    scrollBehavior: TopAppBarScrollBehavior,
) {
    val (dynamicTheme, onDynamicThemeChange) = rememberPreference(
        DynamicThemeKey,
        defaultValue = true
    )
    val (playerTextAlignment, onPlayerTextAlignmentChange) =
        rememberEnumPreference(
            PlayerTextAlignmentKey,
            defaultValue = PlayerTextAlignment.CENTER,
        )

    val (darkMode, onDarkModeChange) = rememberEnumPreference(
        DarkModeKey,
        defaultValue = DarkMode.AUTO
    )

    val (playerButtonsStyle, onPlayerButtonsStyleChange) = rememberEnumPreference(
        PlayerButtonsStyleKey,
        defaultValue = PlayerButtonsStyle.DEFAULT
    )
    val (playerBackground, onPlayerBackgroundChange) =
        rememberEnumPreference(
            PlayerBackgroundStyleKey,
            defaultValue = PlayerBackgroundStyle.DEFAULT,
        )
    val (pureBlack, onPureBlackChange) = rememberPreference(PureBlackKey, defaultValue = false)
    val (defaultOpenTab, onDefaultOpenTabChange) = rememberEnumPreference(
        DefaultOpenTabKey,
        defaultValue = NavigationTab.HOME
    )
    val (lyricsPosition, onLyricsPositionChange) = rememberEnumPreference(
        LyricsTextPositionKey,
        defaultValue = LyricsPosition.CENTER
    )
    val (lyricsClick, onLyricsClickChange) = rememberPreference(LyricsClickKey, defaultValue = true)
    val (sliderStyle, onSliderStyleChange) = rememberEnumPreference(
        SliderStyleKey,
        defaultValue = SliderStyle.SQUIGGLY
    )
    val (swipeThumbnail, onSwipeThumbnailChange) = rememberPreference(
        SwipeThumbnailKey,
        defaultValue = true
    )
    val (gridItemSize, onGridItemSizeChange) = rememberEnumPreference(
        GridItemsSizeKey,
        defaultValue = GridItemSize.BIG
    )

    val (slimNav, onSlimNavChange) = rememberPreference(SlimNavBarKey, defaultValue = false)

    val availableBackgroundStyles = PlayerBackgroundStyle.entries.filter {
        it != PlayerBackgroundStyle.BLUR || Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
    }

    val isSystemInDarkTheme = isSystemInDarkTheme()
    val useDarkTheme =
        remember(darkMode, isSystemInDarkTheme) {
            if (darkMode == DarkMode.AUTO) isSystemInDarkTheme else darkMode == DarkMode.ON
        }

    val (defaultChip, onDefaultChipChange) = rememberEnumPreference(
        key = ChipSortTypeKey,
        defaultValue = LibraryFilter.LIBRARY
    )

    var showSliderOptionDialog by rememberSaveable {
        mutableStateOf(false)
    }

    if (showSliderOptionDialog) {
        DefaultDialog(
            buttons = {
                TextButton(
                    onClick = { showSliderOptionDialog = false }
                ) {
                    Text(text = stringResource(android.R.string.cancel))
                }
            },
            onDismiss = {
                showSliderOptionDialog = false
            }
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier
                        .aspectRatio(1f)
                        .weight(1f)
                        .clip(RoundedCornerShape(16.dp))
                        .border(
                            1.dp,
                            if (sliderStyle == SliderStyle.DEFAULT) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
                            RoundedCornerShape(16.dp)
                        )
                        .clickable {
                            onSliderStyleChange(SliderStyle.DEFAULT)
                            showSliderOptionDialog = false
                        }
                        .padding(16.dp)
                ) {
                    var sliderValue by remember {
                        mutableFloatStateOf(0.5f)
                    }
                    Slider(
                        value = sliderValue,
                        valueRange = 0f..1f,
                        onValueChange = {
                            sliderValue = it
                        },
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        text = stringResource(R.string.default_),
                        style = MaterialTheme.typography.labelLarge
                    )
                }
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier
                        .aspectRatio(1f)
                        .weight(1f)
                        .clip(RoundedCornerShape(16.dp))
                        .border(
                            1.dp,
                            if (sliderStyle == SliderStyle.SQUIGGLY) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
                            RoundedCornerShape(16.dp)
                        )
                        .clickable {
                            onSliderStyleChange(SliderStyle.SQUIGGLY)
                            showSliderOptionDialog = false
                        }
                        .padding(16.dp)
                ) {
                    var sliderValue by remember {
                        mutableFloatStateOf(0.5f)
                    }
                    SquigglySlider(
                        value = sliderValue,
                        valueRange = 0f..1f,
                        onValueChange = {
                            sliderValue = it
                        },
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        text = stringResource(R.string.squiggly),
                        style = MaterialTheme.typography.labelLarge
                    )
                }
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier
                        .aspectRatio(1f)
                        .weight(1f)
                        .clip(RoundedCornerShape(16.dp))
                        .border(
                            1.dp,
                            if (sliderStyle == SliderStyle.SLIM) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
                            RoundedCornerShape(16.dp)
                        )
                        .clickable {
                            onSliderStyleChange(SliderStyle.SLIM)
                            showSliderOptionDialog = false
                        }
                        .padding(16.dp)
                ) {
                    var sliderValue by remember {
                        mutableFloatStateOf(0.5f)
                    }
                    Slider(
                        value = sliderValue,
                        valueRange = 0f..1f,
                        onValueChange = {
                            sliderValue = it
                        },
                        thumb = { Spacer(modifier = Modifier.size(0.dp)) },
                        track = { sliderState ->
                            PlayerSliderTrack(
                                sliderState = sliderState,
                                colors = SliderDefaults.colors()
                            )
                        },
                        modifier = Modifier
                            .weight(1f)
                            .pointerInput(Unit) {
                                detectTapGestures(
                                    onPress = {}
                                )
                            }
                    )

                    Text(
                        text = stringResource(R.string.slim),
                        style = MaterialTheme.typography.labelLarge
                    )
                }
            }
        }
    }

    Column(
        Modifier
            .windowInsetsPadding(LocalPlayerAwareWindowInsets.current)
            .verticalScroll(rememberScrollState()),
    ) {
        PreferenceGroupTitle(
            title = stringResource(R.string.theme),
        )

        SwitchPreference(
            title = { Text(stringResource(R.string.enable_dynamic_theme)) },
            icon = { Icon(painterResource(R.drawable.palette), null) },
            checked = dynamicTheme,
            onCheckedChange = onDynamicThemeChange,
        )

        EnumListPreference(
            title = { Text(stringResource(R.string.dark_theme)) },
            icon = { Icon(painterResource(R.drawable.dark_mode), null) },
            selectedValue = darkMode,
            onValueSelected = onDarkModeChange,
            valueText = {
                when (it) {
                    DarkMode.ON -> stringResource(R.string.dark_theme_on)
                    DarkMode.OFF -> stringResource(R.string.dark_theme_off)
                    DarkMode.AUTO -> stringResource(R.string.dark_theme_follow_system)
                }
            },
        )

        AnimatedVisibility(useDarkTheme) {
            SwitchPreference(
                title = { Text(stringResource(R.string.pure_black)) },
                icon = { Icon(painterResource(R.drawable.contrast), null) },
                checked = pureBlack,
                onCheckedChange = onPureBlackChange,
            )
        }

        PreferenceGroupTitle(
            title = stringResource(R.string.player),
        )

        // Determinar las opciones disponibles según la versión de Android
        val availableBackgroundStyles = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            enumValues<PlayerBackgroundStyle>().toList()
        } else {
            enumValues<PlayerBackgroundStyle>().filter {
                it != PlayerBackgroundStyle.BLUR
            }
        }

// También asegurarnos de que el valor seleccionado sea compatible
        val safeSelectedValue = if (playerBackground == PlayerBackgroundStyle.BLUR &&
            Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            PlayerBackgroundStyle.DEFAULT // O cualquier otro valor por defecto
        } else {
            playerBackground
        }

// Usar el componente actualizado
        EnumListPreference(
            title = { Text(stringResource(R.string.player_background_style)) },
            icon = { Icon(painterResource(R.drawable.gradient), null) },
            selectedValue = safeSelectedValue,
            onValueSelected = onPlayerBackgroundChange,
            valueText = {
                when (it) {
                    PlayerBackgroundStyle.DEFAULT -> stringResource(R.string.follow_theme)
                    PlayerBackgroundStyle.GRADIENT -> stringResource(R.string.gradient)
                    PlayerBackgroundStyle.BLUR -> stringResource(R.string.player_background_blur)
                }
            },
            values = availableBackgroundStyles
        )

        ThumbnailCornerRadiusSelectorButton(
            modifier = Modifier.padding(16.dp),
            onRadiusSelected = { selectedRadius ->
                // Aquí puedes manejar el valor del radio seleccionado
                Timber.tag("Thumbnail").d("Radio seleccionado: $selectedRadius")
            }
        )

        EnumListPreference(
            title = { Text(stringResource(R.string.player_buttons_style)) },
            icon = { Icon(painterResource(R.drawable.palette), null) },
            selectedValue = playerButtonsStyle,
            onValueSelected = onPlayerButtonsStyleChange,
            valueText = {
                when (it) {
                    PlayerButtonsStyle.DEFAULT -> stringResource(R.string.default_style)
                    PlayerButtonsStyle.SECONDARY -> stringResource(R.string.secondary_color_style)
                }
            },
        )


        PreferenceEntry(
            title = { Text(stringResource(R.string.player_slider_style)) },
            description =
                when (sliderStyle) {
                    SliderStyle.DEFAULT -> stringResource(R.string.default_)
                    SliderStyle.SQUIGGLY -> stringResource(R.string.squiggly)
                    SliderStyle.SLIM -> stringResource(R.string.slim)
                },
            icon = { Icon(painterResource(R.drawable.sliders), null) },
            onClick = {
                showSliderOptionDialog = true
            },
        )

        SwitchPreference(
            title = { Text(stringResource(R.string.enable_swipe_thumbnail)) },
            icon = { Icon(painterResource(R.drawable.swipe), null) },
            checked = swipeThumbnail,
            onCheckedChange = onSwipeThumbnailChange,
        )
        EnumListPreference(
            title = { Text(stringResource(R.string.player_text_alignment)) },
            icon = {
                Icon(
                    painter =
                        painterResource(
                            when (playerTextAlignment) {
                                PlayerTextAlignment.CENTER -> R.drawable.format_align_center
                                PlayerTextAlignment.SIDED -> R.drawable.format_align_left
                            },
                        ),
                    contentDescription = null,
                )
            },
            selectedValue = playerTextAlignment,
            onValueSelected = onPlayerTextAlignmentChange,
            valueText = {
                when (it) {
                    PlayerTextAlignment.SIDED -> stringResource(R.string.sided)
                    PlayerTextAlignment.CENTER -> stringResource(R.string.center)
                }
            },
        )

        EnumListPreference(
            title = { Text(stringResource(R.string.lyrics_text_position)) },
            icon = { Icon(painterResource(R.drawable.lyrics), null) },
            selectedValue = lyricsPosition,
            onValueSelected = onLyricsPositionChange,
            valueText = {
                when (it) {
                    LyricsPosition.LEFT -> stringResource(R.string.left)
                    LyricsPosition.CENTER -> stringResource(R.string.center)
                    LyricsPosition.RIGHT -> stringResource(R.string.right)
                }
            },
        )

        SwitchPreference(
            title = { Text(stringResource(R.string.lyrics_click_change)) },
            icon = { Icon(painterResource(R.drawable.lyrics), null) },
            checked = lyricsClick,
            onCheckedChange = onLyricsClickChange,
        )

        PreferenceGroupTitle(
            title = stringResource(R.string.misc),
        )

        EnumListPreference(
            title = { Text(stringResource(R.string.default_open_tab)) },
            icon = { Icon(painterResource(R.drawable.nav_bar), null) },
            selectedValue = defaultOpenTab,
            onValueSelected = onDefaultOpenTabChange,
            valueText = {
                when (it) {
                    NavigationTab.HOME -> stringResource(R.string.home)
                    NavigationTab.EXPLORE -> stringResource(R.string.explore)
                    NavigationTab.LIBRARY -> stringResource(R.string.filter_library)
                }
            },
        )

        ListPreference(
            title = { Text(stringResource(R.string.default_lib_chips)) },
            icon = { Icon(painterResource(R.drawable.tab), null) },
            selectedValue = defaultChip,
            values = listOf(
                LibraryFilter.LIBRARY, LibraryFilter.PLAYLISTS, LibraryFilter.SONGS,
                LibraryFilter.ALBUMS, LibraryFilter.ARTISTS
            ),
            valueText = {
                when (it) {
                    LibraryFilter.SONGS -> stringResource(R.string.songs)
                    LibraryFilter.ARTISTS -> stringResource(R.string.artists)
                    LibraryFilter.ALBUMS -> stringResource(R.string.albums)
                    LibraryFilter.PLAYLISTS -> stringResource(R.string.playlists)
                    LibraryFilter.LIBRARY -> stringResource(R.string.filter_library)
                }
            },
            onValueSelected = onDefaultChipChange,
        )

        SwitchPreference(
            title = { Text(stringResource(R.string.slim_navbar)) },
            icon = { Icon(painterResource(R.drawable.nav_bar), null) },
            checked = slimNav,
            onCheckedChange = onSlimNavChange
        )

        EnumListPreference(
            title = { Text(stringResource(R.string.grid_cell_size)) },
            icon = { Icon(painterResource(R.drawable.grid_view), null) },
            selectedValue = gridItemSize,
            onValueSelected = onGridItemSizeChange,
            valueText = {
                when (it) {
                    GridItemSize.SMALL -> stringResource(R.string.small)
                    GridItemSize.BIG -> stringResource(R.string.big)
                }
            },
        )


        CustomAvatarSelector()
    }

    TopAppBar(
        title = { Text(stringResource(R.string.appearance)) },
        navigationIcon = {
            IconButton(
                onClick = navController::navigateUp,
                onLongClick = navController::backToMain,
            ) {
                Icon(
                    painterResource(R.drawable.arrow_back),
                    contentDescription = null,
                )
            }
        },
    )
}


// Extensión de contexto para DataStore
val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "app_settings")

object AppConfig {
    private val THUMBNAIL_CORNER_RADIUS_KEY = floatPreferencesKey("thumbnail_corner_radius")

    // Guardar el valor de thumbnail corner radius
    suspend fun saveThumbnailCornerRadius(context: Context, radius: Float) {
        context.dataStore.edit { preferences ->
            preferences[THUMBNAIL_CORNER_RADIUS_KEY] = radius
        }
    }

    // Obtener el valor de thumbnail corner radius, o un valor por defecto si no está presente
    suspend fun getThumbnailCornerRadius(context: Context, defaultValue: Float = 16f): Float {
        return context.dataStore.data
            .map { preferences ->
                preferences[THUMBNAIL_CORNER_RADIUS_KEY] ?: defaultValue
            }.first()
    }
}


@Composable
fun ThumbnailCornerRadiusSelectorButton(
    modifier: Modifier = Modifier,
    onRadiusSelected: (Float) -> Unit
) {
    val context = LocalContext.current
    var showDialog by remember { mutableStateOf(false) }
    var currentRadius by remember { mutableStateOf(24f) }

    // Cargar el valor guardado al iniciar
    LaunchedEffect(Unit) {
        currentRadius = AppConfig.getThumbnailCornerRadius(context)
    }

    // Botón mejorado con mejor semántica y táctil
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .clip(RoundedCornerShape(26.dp)),
        shadowElevation = 10.dp,
        color = MaterialTheme.colorScheme.surface,
        onClick = { showDialog = true }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                painter = painterResource(id = R.drawable.line_curve),
                contentDescription = null,
                modifier = Modifier.size(24.dp),
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = stringResource(
                        id = R.string.customize_thumbnail_corner_radius,
                        currentRadius.roundToInt()
                    ),
                    style = MaterialTheme.typography.bodyLarge,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Icon(
                imageVector = Icons.AutoMirrored.Outlined.ArrowForward,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
        }
    }

    // Modal para seleccionar el radio
    if (showDialog) {
        ThumbnailCornerRadiusModal(
            initialRadius = currentRadius,
            onDismiss = { showDialog = false },
            onRadiusSelected = { newRadius ->
                currentRadius = newRadius
                onRadiusSelected(newRadius)
                showDialog = false
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ThumbnailCornerRadiusModal(
    initialRadius: Float,
    onDismiss: () -> Unit,
    onRadiusSelected: (Float) -> Unit
) {
    val context = LocalContext.current
    var thumbnailCornerRadius by remember { mutableStateOf(initialRadius) }
    val presetValues = listOf(0f, 8f, 16f, 24f, 32f, 40f)
    var customValue by remember { mutableStateOf("") }
    var isCustomSelected by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        isCustomSelected = !presetValues.contains(initialRadius)
        if (isCustomSelected) {
            customValue = initialRadius.roundToInt().toString()
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            dismissOnBackPress = true,
            dismissOnClickOutside = true,
            usePlatformDefaultWidth = false
        )
    ) {

        BoxWithConstraints {
            val screenWidth = maxWidth
            val dialogWidth = when {
                screenWidth > 840.dp -> 0.5f
                screenWidth > 600.dp -> 0.7f
                else -> 0.95f
            }

            Surface(
                modifier = Modifier
                    .fillMaxWidth(dialogWidth)
                    .wrapContentHeight()
                    .clip(RoundedCornerShape(30.dp))
                    .padding(16.dp),
                shape = MaterialTheme.shapes.large,
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 6.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {

                    Spacer(modifier = Modifier.height(16.dp))

                    // Previsualización con imagen de fondo
                    Box(
                        modifier = Modifier
                            .size(160.dp)
                            .clip(RoundedCornerShape(thumbnailCornerRadius.dp))
                            .background(MaterialTheme.colorScheme.surface)
                            .border(
                                width = 1.dp,
                                color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                                shape = RoundedCornerShape(thumbnailCornerRadius.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        // Imagen de ejemplo con bordes redondeados
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .clip(RoundedCornerShape(thumbnailCornerRadius.dp))
                        ) {
                            // Usando un painterResource para cargar una imagen local
                            Image(
                                painter = painterResource(id = R.drawable.previewalbum),
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                        }

                        // Overlay para mostrar el valor del radio
                        Box(
                            modifier = Modifier
                                .align(Alignment.BottomCenter)
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f))
                                .padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "${thumbnailCornerRadius.roundToInt()}dp",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Chips con Layout mejorado y adaptable usando un enfoque alternativo a FlowRow
                    ChipsGrid(
                        values = presetValues,
                        selectedValue = if (isCustomSelected) null else thumbnailCornerRadius,
                        onValueSelected = { value ->
                            thumbnailCornerRadius = value
                            isCustomSelected = false
                        }
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    // Campo personalizado con mejor disposición
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        FilterChip(
                            selected = isCustomSelected,
                            onClick = {
                                isCustomSelected = true
                                if (customValue.isEmpty()) {
                                    customValue = thumbnailCornerRadius.roundToInt().toString()
                                }
                            },
                            label = {
                                Text(
                                    text = stringResource(id = R.string.custom),
                                    style = MaterialTheme.typography.bodyMedium
                                )
                            },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                                selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        )

                        Spacer(modifier = Modifier.width(12.dp))

                        OutlinedTextField(
                            value = customValue,
                            onValueChange = { newValue ->
                                // Solo aceptar números
                                if (newValue.isEmpty() || newValue.all { it.isDigit() }) {
                                    customValue = newValue
                                    newValue.toIntOrNull()?.let { intValue ->
                                        // Limitar a 45
                                        val limitedValue = minOf(intValue, 45).toFloat()
                                        thumbnailCornerRadius = limitedValue
                                        isCustomSelected = true
                                    }
                                }
                            },
                            modifier = Modifier
                                .weight(1f)
                                .height(56.dp),
                            enabled = isCustomSelected,
                            label = {
                                Text(
                                    text = stringResource(id = R.string.custom_value),
                                    style = MaterialTheme.typography.bodyMedium
                                )
                            },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Number
                            ),
                            trailingIcon = {
                                Text(
                                    text = "dp",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            },
                            shape = MaterialTheme.shapes.small
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Sección del slider mejorada para más feedback
                    Column(
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = stringResource(id = R.string.adjust_radius),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "0",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )

                            Slider(
                                value = thumbnailCornerRadius,
                                onValueChange = { newValue ->
                                    thumbnailCornerRadius = newValue
                                    customValue = newValue.roundToInt().toString()
                                    isCustomSelected = !presetValues.contains(newValue)
                                },
                                valueRange = 0f..45f,
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(horizontal = 8.dp),
                                colors = SliderDefaults.colors(
                                    thumbColor = MaterialTheme.colorScheme.primary,
                                    activeTrackColor = MaterialTheme.colorScheme.primary,
                                    inactiveTrackColor = MaterialTheme.colorScheme.surfaceVariant
                                )
                            )

                            Text(
                                text = "45",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        Text(
                            text = stringResource(
                                id = R.string.corner_radius_label,
                                thumbnailCornerRadius.roundToInt().toString()
                            ),
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 8.dp),
                            textAlign = TextAlign.Center,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Divisor para separar visualmente los botones de acción
                    Divider(
                        modifier = Modifier.fillMaxWidth(),
                        thickness = 1.dp,
                        color = MaterialTheme.colorScheme.outlineVariant
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // Botones de acción con mejor UX
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp, Alignment.End),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TextButton(
                            onClick = onDismiss,
                            modifier = Modifier.heightIn(min = 48.dp)
                        ) {
                            Text(
                                text = stringResource(id = R.string.cancel),
                                style = MaterialTheme.typography.labelLarge
                            )
                        }

                        Button(
                            onClick = {
                                CoroutineScope(Dispatchers.IO).launch {
                                    AppConfig.saveThumbnailCornerRadius(
                                        context,
                                        thumbnailCornerRadius
                                    )
                                }
                                onRadiusSelected(thumbnailCornerRadius)
                            },
                            modifier = Modifier.heightIn(min = 48.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.primary,
                                contentColor = MaterialTheme.colorScheme.onPrimary
                            )
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    painter = painterResource(R.drawable.check),
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = stringResource(id = R.string.apply),
                                    style = MaterialTheme.typography.labelLarge
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChipsGrid(
    values: List<Float>,
    selectedValue: Float?,
    onValueSelected: (Float) -> Unit
) {
    val chunkedValues = values.chunked(3) // Divide en filas de 3 elementos

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        chunkedValues.forEach { rowValues ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                rowValues.forEachIndexed { index, value ->
                    FilterChip(
                        selected = selectedValue == value,
                        onClick = { onValueSelected(value) },
                        label = {
                            Text(
                                text = "${value.roundToInt()}",
                                style = MaterialTheme.typography.bodyMedium
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                            selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    )

                    if (index < rowValues.size - 1) {
                        Spacer(modifier = Modifier.width(8.dp))
                    }
                }
            }
        }
    }
}


enum class DarkMode {
    ON,
    OFF,
    AUTO,
}

enum class NavigationTab {
    HOME,
    EXPLORE,
    LIBRARY,
}

enum class LyricsPosition {
    LEFT,
    CENTER,
    RIGHT,
}

enum class PlayerTextAlignment {
    SIDED,
    CENTER,
}


// Extension property para el DataStore
val Context.avatarDataStore: DataStore<Preferences> by preferencesDataStore(name = "avatar_preferences")

/** Gestor de preferencias para el avatar personalizado */
class AvatarPreferenceManager(private val context: Context) {
    companion object {
        private val CUSTOM_AVATAR_URI_KEY = stringPreferencesKey("custom_avatar_uri")
    }

    /** Guarda la URI del avatar personalizado */
    suspend fun saveCustomAvatarUri(uriString: String?) {
        context.avatarDataStore.edit { preferences ->
            if (uriString == null) {
                preferences.remove(CUSTOM_AVATAR_URI_KEY)
            } else {
                preferences[CUSTOM_AVATAR_URI_KEY] = uriString
            }
        }
    }

    /** Flujo para obtener la URI del avatar personalizado */
    val getCustomAvatarUri: Flow<String?> = context.avatarDataStore.data
        .map { preferences ->
            preferences[CUSTOM_AVATAR_URI_KEY]
        }
}

/**
 * Composable que permite al usuario seleccionar y gestionar un avatar
 * personalizado
 */
@Composable
fun CustomAvatarSelector(
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val avatarManager = remember { AvatarPreferenceManager(context) }
    val customAvatarUri by avatarManager.getCustomAvatarUri.collectAsState(initial = null)

    // Crear un ámbito de corrutina para este composable
    val coroutineScope = rememberCoroutineScope()

    // Launcher para seleccionar imagen de la galería
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            // Copiamos la imagen a almacenamiento interno para persistencia
            val file = saveImageToInternalStorage(context, it)
            file?.let { savedFile ->
                val savedUri = Uri.fromFile(savedFile)
                // Lanzamos una corrutina para guardar la URI
                coroutineScope.launch {
                    avatarManager.saveCustomAvatarUri(savedUri.toString())
                }
            }
        }
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = stringResource(id = R.string.custom_avatar_beta), // Reemplazar con string
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface
            )

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                // Previsualización del avatar
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .border(
                            width = 2.dp,
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f),
                            shape = CircleShape
                        )
                        .clickable { galleryLauncher.launch("image/*") },
                    contentAlignment = Alignment.Center
                ) {
                    if (customAvatarUri != null) {
                        Image(
                            painter = rememberAsyncImagePainter(
                                ImageRequest.Builder(context)
                                    .data(data = Uri.parse(customAvatarUri))
                                    .crossfade(true)
                                    .build()
                            ),
                            contentDescription = stringResource(id = R.string.custom_avatar), // Reemplazar con string
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Icon(
                            painter = painterResource(id = R.drawable.person),
                            contentDescription = stringResource(id = R.string.default_avatar), // Reemplazar con string
                            modifier = Modifier.size(36.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Button(
                        onClick = { galleryLauncher.launch("image/*") },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(stringResource(id = R.string.select_image)) // Reemplazar con string
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedButton(
                        onClick = {
                            // Lanzamos una corrutina para restaurar el avatar predeterminado
                            coroutineScope.launch {
                                avatarManager.saveCustomAvatarUri(null)
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = customAvatarUri != null
                    ) {
                        Text(stringResource(id = R.string.restore_default_avatar)) // Reemplazar con string
                    }
                }
            }
        }
    }
}


/** Función para guardar la imagen en almacenamiento interno */
private fun saveImageToInternalStorage(context: Context, uri: Uri): File? {
    return try {
        context.contentResolver.openInputStream(uri)?.use { inputStream ->
            val outputFile = File(context.filesDir, "custom_avatar.jpg")

            FileOutputStream(outputFile).use { outputStream ->
                inputStream.copyTo(outputStream)
            }

            outputFile
        }
    } catch (e: Exception) {
        e.printStackTrace()
        null
    }
}