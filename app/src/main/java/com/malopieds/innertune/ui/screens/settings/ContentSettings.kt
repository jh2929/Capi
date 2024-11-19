package com.malopieds.innertune.ui.screens.settings


import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.net.Uri
import android.os.Build
import android.os.LocaleList
import android.provider.Settings
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.ExperimentalAnimationApi
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.with
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.rounded.ArrowDropDown
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.navigation.NavController
import com.malopieds.innertube.utils.parseCookieString
import com.malopieds.innertune.LocalPlayerAwareWindowInsets
import com.malopieds.innertune.NotificationPermissionPreference
import com.malopieds.innertune.R
import com.malopieds.innertune.constants.AccountChannelHandleKey
import com.malopieds.innertune.constants.AccountEmailKey
import com.malopieds.innertune.constants.AccountNameKey
import com.malopieds.innertune.constants.ChipSortTypeKey
import com.malopieds.innertune.constants.ContentCountryKey
import com.malopieds.innertune.constants.ContentLanguageKey
import com.malopieds.innertune.constants.CountryCodeToName
import com.malopieds.innertune.constants.HideExplicitKey
import com.malopieds.innertune.constants.HistoryDuration
import com.malopieds.innertune.constants.InnerTubeCookieKey
import com.malopieds.innertune.constants.LanguageCodeToName
import com.malopieds.innertune.constants.LibraryFilter
import com.malopieds.innertune.constants.ProxyEnabledKey
import com.malopieds.innertune.constants.ProxyTypeKey
import com.malopieds.innertune.constants.ProxyUrlKey
import com.malopieds.innertune.constants.QuickPicks
import com.malopieds.innertune.constants.QuickPicksKey
import com.malopieds.innertune.constants.SYSTEM_DEFAULT
import com.malopieds.innertune.constants.TopSize
import com.malopieds.innertune.ui.component.EditTextPreference
import com.malopieds.innertune.ui.component.IconButton
import com.malopieds.innertune.ui.component.ListPreference
import com.malopieds.innertune.ui.component.PreferenceEntry
import com.malopieds.innertune.ui.component.PreferenceGroupTitle
import com.malopieds.innertune.ui.component.SwitchPreference
import com.malopieds.innertune.ui.utils.backToMain
import com.malopieds.innertune.utils.rememberEnumPreference
import com.malopieds.innertune.utils.rememberPreference
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.Proxy
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContentSettings(
    navController: NavController,
    scrollBehavior: TopAppBarScrollBehavior,
) {
    val context = LocalContext.current
    val accountName by rememberPreference(AccountNameKey, "")
    val accountEmail by rememberPreference(AccountEmailKey, "")
    val accountChannelHandle by rememberPreference(AccountChannelHandleKey, "")
    val innerTubeCookie by rememberPreference(InnerTubeCookieKey, "")
    val isLoggedIn =
        remember(innerTubeCookie) {
            "SAPISID" in parseCookieString(innerTubeCookie)
        }
    val (contentLanguage, onContentLanguageChange) = rememberPreference(key = ContentLanguageKey, defaultValue = "system")
    val (contentCountry, onContentCountryChange) = rememberPreference(key = ContentCountryKey, defaultValue = "system")
    val (hideExplicit, onHideExplicitChange) = rememberPreference(key = HideExplicitKey, defaultValue = false)
    val (proxyEnabled, onProxyEnabledChange) = rememberPreference(key = ProxyEnabledKey, defaultValue = false)
    val (proxyType, onProxyTypeChange) = rememberEnumPreference(key = ProxyTypeKey, defaultValue = Proxy.Type.HTTP)
    val (proxyUrl, onProxyUrlChange) = rememberPreference(key = ProxyUrlKey, defaultValue = "host:port")
    val (lengthTop, onLengthTopChange) = rememberPreference(key = TopSize, defaultValue = "50")
    val (historyDuration, onHistoryDurationChange) = rememberPreference(key = HistoryDuration, defaultValue = 30f)
    val (defaultChip, onDefaultChipChange) = rememberEnumPreference(key = ChipSortTypeKey, defaultValue = LibraryFilter.LIBRARY)
    val (quickPicks, onQuickPicksChange) = rememberEnumPreference(key = QuickPicksKey, defaultValue = QuickPicks.QUICK_PICKS)

    Column(
        Modifier
            .windowInsetsPadding(LocalPlayerAwareWindowInsets.current.only(WindowInsetsSides.Horizontal + WindowInsetsSides.Bottom))
            .verticalScroll(rememberScrollState()),
    ) {
        Spacer(Modifier.windowInsetsPadding(LocalPlayerAwareWindowInsets.current.only(WindowInsetsSides.Top)))

        PreferenceEntry(
            title = { Text(if (isLoggedIn) accountName else stringResource(R.string.login)) },
            description =
                if (isLoggedIn) {
                    accountEmail.takeIf { it.isNotEmpty() }
                        ?: accountChannelHandle.takeIf { it.isNotEmpty() }
                } else {
                    null
                },
            icon = { Icon(painterResource(R.drawable.person), null) },
            onClick = { navController.navigate("login") },
        )
        ListPreference(
            title = { Text(stringResource(R.string.content_language)) },
            icon = { Icon(painterResource(R.drawable.language), null) },
            selectedValue = contentLanguage,
            values = listOf(SYSTEM_DEFAULT) + LanguageCodeToName.keys.toList(),
            valueText = {
                LanguageCodeToName.getOrElse(it) {
                    stringResource(R.string.system_default)
                }
            },
            onValueSelected = onContentLanguageChange,
        )
        ListPreference(
            title = { Text(stringResource(R.string.content_country)) },
            icon = { Icon(painterResource(R.drawable.location_on), null) },
            selectedValue = contentCountry,
            values = listOf(SYSTEM_DEFAULT) + CountryCodeToName.keys.toList(),
            valueText = {
                CountryCodeToName.getOrElse(it) {
                    stringResource(R.string.system_default)
                }
            },
            onValueSelected = onContentCountryChange,
        )

        PreferenceGroupTitle(
            title = stringResource(R.string.app_language),
        )
        LanguageSelector()
        SwitchPreference(
            title = { Text(stringResource(R.string.hide_explicit)) },
            icon = { Icon(painterResource(R.drawable.explicit), null) },
            checked = hideExplicit,
            onCheckedChange = onHideExplicitChange,
        )

        NotificationPermissionPreference()

        PreferenceGroupTitle(
            title = stringResource(R.string.proxy),
        )

        SwitchPreference(
            title = { Text(stringResource(R.string.enable_proxy)) },
            icon = { Icon(painterResource(R.drawable.wifi_proxy), null) },
            checked = proxyEnabled,
            onCheckedChange = onProxyEnabledChange,
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PreferenceEntry(
                title = { Text(stringResource(R.string.open_supported_links)) },
                description = stringResource(R.string.configure_supported_links),
                icon = { Icon(painterResource(R.drawable.add_link), null) },
                onClick = {
                    try {
                        context.startActivity(
                            Intent(Settings.ACTION_APP_OPEN_BY_DEFAULT_SETTINGS, Uri.parse("package:${context.packageName}")),
                        )
                    } catch (e: ActivityNotFoundException) {
                        Toast.makeText(context, R.string.intent_supported_links_not_found, Toast.LENGTH_LONG).show()
                    }
                },
            )
        }


        AnimatedVisibility(proxyEnabled) {
            Column {
                ListPreference(
                    title = { Text(stringResource(R.string.proxy_type)) },
                    selectedValue = proxyType,
                    values = listOf(Proxy.Type.HTTP, Proxy.Type.SOCKS),
                    valueText = { it.name },
                    onValueSelected = onProxyTypeChange,
                )
                EditTextPreference(
                    title = { Text(stringResource(R.string.proxy_url)) },
                    value = proxyUrl,
                    onValueChange = onProxyUrlChange,
                )
            }
        }

        EditTextPreference(
            title = { Text(stringResource(R.string.top_length)) },
            value = lengthTop,
            isInputValid = {
                val number = it.toIntOrNull()
                number != null && it.isNotEmpty() && number > 0
            },
            onValueChange = onLengthTopChange,
        )

        ListPreference(
            title = { Text(stringResource(R.string.default_lib_chips)) },
            selectedValue = defaultChip,
            values =
                listOf(
                    LibraryFilter.LIBRARY,
                    LibraryFilter.PLAYLISTS,
                    LibraryFilter.SONGS,
                    LibraryFilter.ALBUMS,
                    LibraryFilter.ARTISTS,
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

        ListPreference(
            title = { Text(stringResource(R.string.set_quick_picks)) },
            selectedValue = quickPicks,
            values = listOf(QuickPicks.QUICK_PICKS, QuickPicks.LAST_LISTEN),
            valueText = {
                when (it) {
                    QuickPicks.QUICK_PICKS -> stringResource(R.string.quick_picks)
                    QuickPicks.LAST_LISTEN -> stringResource(R.string.last_song_listened)
                }
            },
            onValueSelected = onQuickPicksChange,
        )

//        SliderPreference(
//            title = { Text(stringResource(R.string.history_duration)) },
//            value = historyDuration,
//            onValueChange = onHistoryDurationChange,
//        )

    }

    TopAppBar(
        title = { Text(stringResource(R.string.content)) },
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


data class Language(
    val name: String,
    val code: String,
    val nativeName: String,
    val flag: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LanguageSelector(
    modifier: Modifier = Modifier,
    onLanguageSelected: (String) -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val languages = remember {
        listOf(
            Language("Arabic", "ar", "العربية", "🇸🇦"),
            Language("Belarusian", "be", "Беларуская", "🇧🇾"),
            Language("Chinese Simplified", "zh", "简体中文", "🇨🇳"),
            Language("Czech", "cs", "Čeština", "🇨🇿"),
            Language("Dutch", "nl", "Nederlands", "🇳🇱"),
            Language("English", "en", "English", "🇺🇸"),
            Language("French", "fr", "Français", "🇫🇷"),
            Language("German", "de", "Deutsch", "🇩🇪"),
            Language("Indonesian", "id", "Bahasa Indonesia", "🇮🇩"),
            Language("Italian", "it", "Italiano", "🇮🇹"),
            Language("Japanese", "ja", "日本語", "🇯🇵"),
            Language("Korean", "ko", "한국어", "🇰🇷"),
            Language("Portuguese (Brazil)", "pt", "Português", "🇧🇷"),
            Language("Russian", "ru", "Русский", "🇷🇺"),
            Language("Spanish", "es", "Español", "🇪🇸"),
            Language("Turkish", "tr", "Türkçe", "🇹🇷"),
            Language("Ukrainian", "uk", "Українська", "🇺🇦"),
            Language("Vietnamese", "vi", "Tiếng Việt", "🇻🇳")
        )
    }

    var selectedLanguage by remember {
        mutableStateOf(
            languages.find { it.code == getCurrentLocale(context).language }
                ?: languages.find { it.code == "en" }!!
        )
    }
    var expanded by remember { mutableStateOf(false) }

    Box(
        modifier = modifier.fillMaxWidth(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            // Card contenedor del botón
            Card(
                onClick = { expanded = true },
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                ),
                modifier = Modifier.padding(8.dp)
            ) {
                Row(
                    modifier = Modifier
                        .padding(16.dp)
                        .animateContentSize(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        painter = painterResource(R.drawable.translate),
                        contentDescription = null
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = selectedLanguage.flag,
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = selectedLanguage.nativeName,
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Icon(
                        imageVector = if (expanded)
                            Icons.Default.KeyboardArrowUp
                        else
                            Icons.Default.KeyboardArrowDown,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false },
                modifier = Modifier
                    .widthIn(max = 320.dp)
                    .background(
                        MaterialTheme.colorScheme.surface,
                        MaterialTheme.shapes.extraLarge
                    ),
                offset = DpOffset(0.dp, 8.dp)
            ) {
                languages.forEach { language ->
                    ListItem(
                        headlineContent = {
                            Text(
                                text = language.nativeName,
                                style = MaterialTheme.typography.bodyLarge
                            )
                        },
                        supportingContent = {
                            Text(
                                text = language.name,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        },
                        leadingContent = {
                            Text(
                                text = language.flag,
                                style = MaterialTheme.typography.titleMedium
                            )
                        },
                        trailingContent = if (selectedLanguage == language) {
                            {
                                Icon(
                                    imageVector = Icons.Default.Check,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            }
                        } else null,
                        modifier = Modifier.clickable {
                            selectedLanguage = language
                            expanded = false
                            scope.launch {
                                updateLanguage(context, language.code)
                                onLanguageSelected(language.code)
                            }
                        },
                        colors = ListItemDefaults.colors(
                            containerColor = if (selectedLanguage == language)
                                MaterialTheme.colorScheme.surfaceVariant
                            else
                                MaterialTheme.colorScheme.surface
                        )
                    )
                }
            }
        }
    }
}

fun getCurrentLocale(context: Context): Locale {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        context.resources.configuration.locales[0]
    } else {
        @Suppress("DEPRECATION")
        context.resources.configuration.locale
    }
}

suspend fun updateLanguage(context: Context, languageCode: String) {
    val locale = when (languageCode) {
        "pt" -> Locale("pt", "BR")
        else -> Locale(languageCode)
    }

    Locale.setDefault(locale)
    val config = Configuration(context.resources.configuration)
    config.setLocale(locale)

    context.createConfigurationContext(config)
    context.resources.updateConfiguration(config, context.resources.displayMetrics)

    withContext(Dispatchers.Main) {
        (context as? ComponentActivity)?.recreate()
    }
}
