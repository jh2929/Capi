package com.arturo254.opentune.ui.screens.settings

import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.content.res.Resources
import android.os.Build
import android.os.Handler
import android.os.LocaleList
import android.os.Looper
import android.util.Log
import android.widget.Toast
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarScrollBehavior
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.capitalize
import androidx.compose.ui.text.toLowerCase
import androidx.core.os.ConfigurationCompat
import androidx.core.os.LocaleListCompat
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.navigation.NavController
import com.arturo254.opentune.LocalPlayerAwareWindowInsets
import com.arturo254.opentune.NotificationPermissionPreference
import com.arturo254.opentune.R
import com.arturo254.opentune.constants.CountryCodeToName
import com.arturo254.opentune.constants.LanguageCodeToName
import com.arturo254.opentune.constants.PreferredLyricsProvider
import com.arturo254.opentune.constants.QuickPicks
import com.arturo254.opentune.constants.SYSTEM_DEFAULT
import com.arturo254.opentune.ui.component.EditTextPreference
import com.arturo254.opentune.ui.component.IconButton
import com.arturo254.opentune.ui.component.ListPreference
import com.arturo254.opentune.ui.component.PreferenceGroupTitle
import com.arturo254.opentune.ui.component.SliderPreference
import com.arturo254.opentune.ui.component.SwitchPreference
import com.arturo254.opentune.ui.utils.backToMain
import com.arturo254.opentune.utils.rememberEnumPreference
import com.arturo254.opentune.utils.rememberPreference
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.net.Proxy
import java.util.Locale

object PreferenceKeys {
    val ContentLanguageKey = stringPreferencesKey("content_language")
    val ContentCountryKey = stringPreferencesKey("content_country")
    val HideExplicitKey = booleanPreferencesKey("hide_explicit")
    val ProxyEnabledKey = booleanPreferencesKey("proxy_enabled")
    val ProxyTypeKey = stringPreferencesKey("proxy_type")
    val ProxyUrlKey = stringPreferencesKey("proxy_url")
    val TopSizeKey = stringPreferencesKey("top_size")
    val HistoryDurationKey = floatPreferencesKey("history_duration")
    val QuickPicksKey = stringPreferencesKey("quick_picks")
    val EnableKugouKey = booleanPreferencesKey("enable_kugou")
    val EnableLrcLibKey = booleanPreferencesKey("enable_lrclib")
    val PreferredLyricsProviderKey = stringPreferencesKey("preferred_lyrics_provider")
    val AppLanguageKey = stringPreferencesKey("app_language")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContentSettings(
    navController: NavController,
    scrollBehavior: TopAppBarScrollBehavior,
) {
    val context = LocalContext.current
    val localeManager = remember { LocaleManager(context) }

    val (contentLanguage, onContentLanguageChange) = rememberPreference(
        key = PreferenceKeys.ContentLanguageKey,
        defaultValue = "system"
    )
    val (contentCountry, onContentCountryChange) = rememberPreference(
        key = PreferenceKeys.ContentCountryKey,
        defaultValue = "system"
    )
    val (hideExplicit, onHideExplicitChange) = rememberPreference(
        key = PreferenceKeys.HideExplicitKey,
        defaultValue = false
    )
    val (proxyEnabled, onProxyEnabledChange) = rememberPreference(
        key = PreferenceKeys.ProxyEnabledKey,
        defaultValue = false
    )
    val (proxyType, onProxyTypeChange) = rememberEnumPreference(
        key = PreferenceKeys.ProxyTypeKey,
        defaultValue = Proxy.Type.HTTP
    )
    val (proxyUrl, onProxyUrlChange) = rememberPreference(
        key = PreferenceKeys.ProxyUrlKey,
        defaultValue = "host:port"
    )
    val (lengthTop, onLengthTopChange) = rememberPreference(
        key = PreferenceKeys.TopSizeKey,
        defaultValue = "50"
    )
    val (historyDuration, onHistoryDurationChange) = rememberPreference(
        key = PreferenceKeys.HistoryDurationKey,
        defaultValue = 30f
    )
    val (quickPicks, onQuickPicksChange) = rememberEnumPreference(
        key = PreferenceKeys.QuickPicksKey,
        defaultValue = QuickPicks.QUICK_PICKS
    )
    val (enableKugou, onEnableKugouChange) = rememberPreference(
        key = PreferenceKeys.EnableKugouKey,
        defaultValue = true
    )
    val (enableLrclib, onEnableLrclibChange) = rememberPreference(
        key = PreferenceKeys.EnableLrcLibKey,
        defaultValue = true
    )
    val (preferredProvider, onPreferredProviderChange) = rememberEnumPreference(
        key = PreferenceKeys.PreferredLyricsProviderKey,
        defaultValue = PreferredLyricsProvider.LRCLIB
    )
    val (selectedLanguage, setSelectedLanguage) = rememberPreference(
        key = PreferenceKeys.AppLanguageKey,
        defaultValue = "en"
    )

    Column(
        Modifier
            .windowInsetsPadding(LocalPlayerAwareWindowInsets.current)
            .verticalScroll(rememberScrollState()),
    ) {
        // General settings
        PreferenceGroupTitle(title = stringResource(R.string.general))
        ListPreference(
            title = { Text(stringResource(R.string.content_language)) },
            icon = { Icon(painterResource(R.drawable.language), null) },
            selectedValue = contentLanguage,
            values = listOf(SYSTEM_DEFAULT) + LanguageCodeToName.keys.toList(),
            valueText = {
                LanguageCodeToName.getOrElse(it) { stringResource(R.string.system_default) }
            },
            onValueSelected = onContentLanguageChange,
        )
        ListPreference(
            title = { Text(stringResource(R.string.content_country)) },
            icon = { Icon(painterResource(R.drawable.location_on), null) },
            selectedValue = contentCountry,
            values = listOf(SYSTEM_DEFAULT) + CountryCodeToName.keys.toList(),
            valueText = {
                CountryCodeToName.getOrElse(it) { stringResource(R.string.system_default) }
            },
            onValueSelected = onContentCountryChange,
        )

        // Hide explicit content
        SwitchPreference(
            title = { Text(stringResource(R.string.hide_explicit)) },
            icon = { Icon(painterResource(R.drawable.explicit), null) },
            checked = hideExplicit,
            onCheckedChange = onHideExplicitChange,
        )

        NotificationPermissionPreference()

        // Language settings
        PreferenceGroupTitle(title = stringResource(R.string.app_language))

        LanguagePreference()

        // Proxy settings
        PreferenceGroupTitle(title = stringResource(R.string.proxy))
        SwitchPreference(
            title = { Text(stringResource(R.string.enable_proxy)) },
            icon = { Icon(painterResource(R.drawable.wifi_proxy), null) },
            checked = proxyEnabled,
            onCheckedChange = onProxyEnabledChange,
        )
        if (proxyEnabled) {
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

        // Lyrics settings
        PreferenceGroupTitle(title = stringResource(R.string.lyrics))
        SwitchPreference(
            title = { Text(stringResource(R.string.enable_lrclib)) },
            icon = { Icon(painterResource(R.drawable.lyrics), null) },
            checked = enableLrclib,
            onCheckedChange = onEnableLrclibChange,
        )
        SwitchPreference(
            title = { Text(stringResource(R.string.enable_kugou)) },
            icon = { Icon(painterResource(R.drawable.lyrics), null) },
            checked = enableKugou,
            onCheckedChange = onEnableKugouChange,
        )
        ListPreference(
            title = { Text(stringResource(R.string.set_first_lyrics_provider)) },
            icon = { Icon(painterResource(R.drawable.lyrics), null) },
            selectedValue = preferredProvider,
            values = listOf(PreferredLyricsProvider.KUGOU, PreferredLyricsProvider.LRCLIB),
            valueText = {
                it.name.toLowerCase(androidx.compose.ui.text.intl.Locale.current)
                    .capitalize(androidx.compose.ui.text.intl.Locale.current)
            },
            onValueSelected = onPreferredProviderChange,
        )

        // Misc settings
        PreferenceGroupTitle(title = stringResource(R.string.misc))
        EditTextPreference(
            title = { Text(stringResource(R.string.top_length)) },
            icon = { Icon(painterResource(R.drawable.trending_up), null) },
            value = lengthTop,
            isInputValid = { it.toIntOrNull()?.let { num -> num > 0 } == true },
            onValueChange = onLengthTopChange,
        )
        ListPreference(
            title = { Text(stringResource(R.string.set_quick_picks)) },
            icon = { Icon(painterResource(R.drawable.home_outlined), null) },
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
        SliderPreference(
            title = { Text(stringResource(R.string.history_duration)) },
            icon = { Icon(painterResource(R.drawable.history), null) },
            value = historyDuration,
            onValueChange = onHistoryDurationChange,
        )
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

/**
 * Enhanced LocaleManager for handling locale changes in Jetpack Compose applications.
 * Detects available languages from the app's resources and maintains locale preferences.
 */
class LocaleManager(private val context: Context) {

    companion object {
        private const val TAG = "LocaleManager"
        private const val PREF_NAME = "LocalePreferences"
        private const val PREF_LANGUAGE_KEY = "selected_language"
        private const val DEFAULT_LANGUAGE = "en"

        // Languages that require special script handling
        private val COMPLEX_SCRIPT_LANGUAGES = setOf(
            "ne", "mr", "hi", "bn", "pa", "gu", "ta", "te", "kn", "ml",
            "si", "th", "lo", "my", "ka", "am", "km",
            "zh-CN", "zh-TW", "zh-HK", "ja", "ko"
        )

        // Cached language map for use across the app
        val availableLanguageCodeToName: MutableMap<String, String> = mutableMapOf()

        // Singleton instance
        @Volatile
        private var instance: LocaleManager? = null

        fun getInstance(context: Context): LocaleManager {
            return instance ?: synchronized(this) {
                instance ?: LocaleManager(context.applicationContext).also { instance = it }
            }
        }
    }

    private val sharedPreferences = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    // StateFlow to observe language changes
    private val _currentLanguage = MutableStateFlow(getSelectedLanguageCode())
    val currentLanguage: StateFlow<String> = _currentLanguage

    // Cache for available languages
    private var _availableLanguages: Map<String, String>? = null

    /** Get the currently selected language code */
    fun getSelectedLanguageCode(): String {
        return sharedPreferences.getString(PREF_LANGUAGE_KEY, getSystemLanguageCode())
            ?: getSystemLanguageCode()
    }

    /** Get the system default language code */
    private fun getSystemLanguageCode(): String {
        val localeList = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            ConfigurationCompat.getLocales(Resources.getSystem().configuration)
        } else {
            LocaleListCompat.create(Locale.getDefault())
        }

        val systemLanguage = if (localeList.isEmpty) DEFAULT_LANGUAGE else localeList[0]?.language ?: DEFAULT_LANGUAGE

        // Check if the system language has a country code
        val systemLocale = if (localeList.isEmpty) Locale.getDefault() else localeList[0] ?: Locale.getDefault()
        val country = systemLocale.country

        // For languages that typically need country specification
        return when {
            systemLanguage == "zh" && country.isNotEmpty() -> {
                when (country) {
                    "CN" -> "zh-CN"
                    "TW" -> "zh-TW"
                    "HK" -> "zh-HK"
                    else -> "zh-CN" // Default to simplified as fallback
                }
            }
            systemLanguage == "pt" && country == "BR" -> "pt-BR"
            else -> systemLanguage
        }
    }

    /**
     * Update the locale synchronously (for Compose compatibility)
     *
     * @param languageCode The language code to set
     * @return true if successful, false otherwise
     */
    fun updateLocale(languageCode: String): Boolean {
        try {
            // Check if the requested language is available
            if (!getAvailableLanguages().containsKey(languageCode)) {
                Log.w(TAG, "Language $languageCode is not available in this app")
                // Fall back to default language if not available
                return false
            }

            // Save preference
            sharedPreferences.edit().putString(PREF_LANGUAGE_KEY, languageCode).apply()
            _currentLanguage.value = languageCode

            val locale = createLocaleFromCode(languageCode)
            // Create a new Configuration instance instead of cloning
            val config = Configuration(context.resources.configuration)

            // Update Locale.default for APIs that might use it
            Locale.setDefault(locale)

            // Apply configuration based on API level
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                setLocaleApi24(config, locale)
            } else {
                setLocaleLegacy(config, locale)
            }

            // Update resources configuration
            val resources = context.resources
            @Suppress("DEPRECATION")
            resources.updateConfiguration(config, resources.displayMetrics)

            return true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update locale", e)
            return false
        }
    }

    /** Apply locale to a context */
    fun applyLocaleToContext(baseContext: Context): Context {
        val languageCode = getSelectedLanguageCode()
        val locale = createLocaleFromCode(languageCode)
        Locale.setDefault(locale)

        val config = Configuration(baseContext.resources.configuration)

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            config.setLocale(locale)
            val localeList = LocaleList(locale)
            LocaleList.setDefault(localeList)
            config.setLocales(localeList)
            baseContext.createConfigurationContext(config)
        } else {
            @Suppress("DEPRECATION")
            config.locale = locale
            @Suppress("DEPRECATION")
            baseContext.resources.updateConfiguration(config, baseContext.resources.displayMetrics)
            baseContext
        }
    }

    /** Creates a Locale object from a language code */
    fun createLocaleFromCode(languageCode: String): Locale {
        return when {
            languageCode == "zh-CN" -> Locale.SIMPLIFIED_CHINESE
            languageCode == "zh-TW" -> Locale.TRADITIONAL_CHINESE
            languageCode == "zh-HK" -> Locale("zh", "HK")

            languageCode in COMPLEX_SCRIPT_LANGUAGES -> {
                if (languageCode.contains("-")) {
                    val (language, country) = languageCode.split("-")
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        Locale.Builder()
                            .setLanguage(language)
                            .setRegion(country)
                            .setScript(getScriptForLanguage(languageCode))
                            .build()
                    } else {
                        Locale(language, country)
                    }
                } else {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        Locale.Builder()
                            .setLanguage(languageCode)
                            .setScript(getScriptForLanguage(languageCode))
                            .build()
                    } else {
                        Locale(languageCode)
                    }
                }
            }

            languageCode.contains("-") -> {
                val parts = languageCode.split("-")
                if (parts.size >= 2) {
                    Locale(parts[0], parts[1])
                } else {
                    Locale(languageCode)
                }
            }

            else -> Locale(languageCode)
        }
    }

    /** Get the appropriate script for complex languages */
    private fun getScriptForLanguage(languageCode: String): String {
        return when (languageCode.substringBefore("-")) {
            "hi", "mr" -> "Deva" // Devanagari
            "bn" -> "Beng" // Bengali
            "pa" -> "Guru" // Gurmukhi
            "gu" -> "Gujr" // Gujarati
            "ta" -> "Taml" // Tamil
            "te" -> "Telu" // Telugu
            "kn" -> "Knda" // Kannada
            "ml" -> "Mlym" // Malayalam
            "si" -> "Sinh" // Sinhala
            "th" -> "Thai" // Thai
            "ka" -> "Geor" // Georgian
            "am" -> "Ethi" // Ethiopic
            "km" -> "Khmr" // Khmer
            "ne" -> "Deva" // Nepali uses Devanagari
            "lo" -> "Laoo" // Lao
            "my" -> "Mymr" // Myanmar/Burmese
            else -> ""
        }
    }

    /** Set locale for Android N and above */
    private fun setLocaleApi24(config: Configuration, locale: Locale) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val localeList = LocaleList(locale)
            LocaleList.setDefault(localeList)
            config.setLocales(localeList)
        }
    }

    /** Set locale for Android versions below N */
    @Suppress("DEPRECATION")
    private fun setLocaleLegacy(config: Configuration, locale: Locale) {
        config.locale = locale
    }

    /**
     * Detects available languages from the app's resources
     * @return Map of language codes to their display names
     */
    fun getAvailableLanguages(): Map<String, String> {
        // Return cached value if available
        _availableLanguages?.let { return it }

        val result = mutableMapOf<String, String>()

        try {
            // Method 1: Check for values directories in assets
            detectLanguagesFromAssets(result)

            // Method 2: Check string resources for availability
            detectLanguagesFromResources(result)

            // Method 3: Check for string resource files in resources
            detectLanguagesFromResourceFiles(result)

            // Always ensure at least the default language is available
            if (result.isEmpty()) {
                result[DEFAULT_LANGUAGE] = getLanguageDisplayName(DEFAULT_LANGUAGE)
                // Add Spanish as a fallback example of another language
                result["es"] = "Spanish (Español)"
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error detecting available languages", e)
            // Fall back to some common languages if detection fails
            result[DEFAULT_LANGUAGE] = "English"
            result["es"] = "Spanish (Español)"
        }

        // Update the companion object cache for use across the app
        availableLanguageCodeToName.clear()
        availableLanguageCodeToName.putAll(result)

        // Cache the result
        _availableLanguages = result
        return result
    }

    /**
     * Detect languages by examining assets directories
     */
    private fun detectLanguagesFromAssets(result: MutableMap<String, String>) {
        try {
            val assetManager = context.assets
            val resDirs = assetManager.list("res") ?: emptyArray()

            // Collect all values directories that look like language qualifiers
            val langDirs = resDirs.filter {
                it.startsWith("values-") &&
                        !it.contains("night") &&
                        !it.contains("v21") &&
                        !it.contains("v23") &&
                        !it.contains("land") &&
                        !it.contains("port") &&
                        !it.contains("xhdpi") &&
                        !it.contains("xxhdpi") &&
                        !it.contains("xxxhdpi") &&
                        !it.contains("hdpi") &&
                        !it.contains("mdpi") &&
                        !it.contains("ldpi")
            }

            // Always add default language (English)
            result[DEFAULT_LANGUAGE] = getLanguageDisplayName(DEFAULT_LANGUAGE)

            // Extract language codes from directory names
            for (dir in langDirs) {
                val qualifiers = dir.removePrefix("values-")
                val langCode = extractLanguageCode(qualifiers)

                if (langCode.isNotEmpty()) {
                    result[langCode] = getLanguageDisplayName(langCode)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error detecting languages from assets", e)
        }
    }

    /**
     * Detect languages by checking for string resources in different locales
     */
    private fun detectLanguagesFromResources(result: MutableMap<String, String>) {
        try {
            // Always add the default language
            result[DEFAULT_LANGUAGE] = getLanguageDisplayName(DEFAULT_LANGUAGE)

            // Try to get the app_name resource ID as a test resource
            val resourceId = context.resources.getIdentifier("app_name", "string", context.packageName)
            if (resourceId == 0) return

            // Get the configuration and resources
            val config = Configuration(context.resources.configuration)
            val metrics = context.resources.displayMetrics

            // Common language codes to check
            val commonLanguages = listOf(
                "de", // Alemán
                "af", // Afrikaans
                "ar", // Árabe
                "be", // Bielorruso
                "bn", // Bengalí
                "ca", // Catalán
                "cs", // Checo
                "da", // Danés
                "de", // Alemán
                "el", // Griego
                "en", // Inglés
                "es", // Español
                "fa", // Persa (Farsi)
                "fr", // Francés
                "hu", // Húngaro
                "id", // Indonesio
                "it", // Italiano
                "iw", // Hebreo
                "ja", // Japonés
                "ko", // Coreano
                "ml", // Malayalam
                "ne", // Nepalí
                "nl", // Neerlandés
                "no", // Noruego
                "or", // Oriya
                "pa", // Punyabí
                "pl", // Polaco
                "pt", // Portugués
                "ru", // Ruso
                "ro", // Rumano
                "sr", // Serbio
                "sv", // Sueco
                "tr", // Turco
                "uk", // Ucraniano
                "vi", // Vietnamita
                "zh"  // Chino (Simplificado/Tradicional)
            )


            for (langCode in commonLanguages) {
                try {
                    // Create a locale for this language
                    val locale = createLocaleFromCode(langCode)

                    // Try to set this locale
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        config.setLocale(locale)
                    } else {
                        @Suppress("DEPRECATION")
                        config.locale = locale
                    }

                    // Create a new resources object with this configuration
                    val localizedResources = Resources(context.assets, metrics, config)

                    // Try to get the app_name string with this locale
                    localizedResources.getString(resourceId)

                    // If we get here without exception, add the language
                    result[langCode] = getLanguageDisplayName(langCode)

                    // For Chinese, also check regional variants
                    if (langCode == "zh") {
                        result["zh-CN"] = getLanguageDisplayName("zh-CN")
                        result["zh-TW"] = getLanguageDisplayName("zh-TW")
                        result["zh-HK"] = getLanguageDisplayName("zh-HK")
                    }

                    // For Portuguese, check Brazilian variant
                    if (langCode == "pt") {
                        result["pt-BR"] = getLanguageDisplayName("pt-BR")
                    }
                } catch (e: Exception) {
                    // This language probably doesn't have resources
                    continue
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error detecting languages from resources", e)
        }
    }

    /**
     * Detect languages by examining resource files directly
     */
    private fun detectLanguagesFromResourceFiles(result: MutableMap<String, String>) {
        try {
            // Get the resources
            val resources = context.resources

            // Always add default language
            result[DEFAULT_LANGUAGE] = getLanguageDisplayName(DEFAULT_LANGUAGE)

            // Get the resource configuration info to determine available languages
            val configInfo = resources.configuration

            // Get available locales from the system
            val locales = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                val localeList = configInfo.locales
                (0 until localeList.size()).map { localeList.get(it) }
            } else {
                @Suppress("DEPRECATION")
                listOf(configInfo.locale)
            }

            // Add all system locales as potentially available
            for (locale in locales) {
                val langCode = locale.language
                if (langCode.isNotEmpty()) {
                    // Handle special cases like Chinese
                    when {
                        langCode == "zh" && locale.country.isNotEmpty() -> {
                            val fullCode = "$langCode-${locale.country}"
                            result[fullCode] = getLanguageDisplayName(fullCode)
                        }
                        langCode == "pt" && locale.country == "BR" -> {
                            result["pt-BR"] = getLanguageDisplayName("pt-BR")
                        }
                        else -> {
                            result[langCode] = getLanguageDisplayName(langCode)
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error detecting languages from resource files", e)
        }
    }

    /**
     * Extract language code from resource qualifier
     */
    private fun extractLanguageCode(qualifier: String): String {
        // Process standard language tags like 'es', 'fr-rCA'
        return when {
            // For language-region format like 'zh-rCN'
            qualifier.contains("-r") -> {
                val parts = qualifier.split("-r")
                if (parts.size == 2) {
                    "${parts[0]}-${parts[1]}"
                } else {
                    parts[0]
                }
            }
            // For simple language codes like 'es', 'fr'
            qualifier.length == 2 && qualifier[0].isLowerCase() && qualifier[1].isLowerCase() -> {
                qualifier
            }
            // Other qualifiers we don't recognize as language codes
            else -> ""
        }
    }

    /**
     * Get localized display name for a language
     */
    private fun getLanguageDisplayName(languageCode: String): String {
        return try {
            val locale = createLocaleFromCode(languageCode)
            val nativeName = locale.getDisplayLanguage(locale)
            val englishName = locale.getDisplayLanguage(Locale.ENGLISH)

            // Format: "English Name (Native Name)" or just "English Name" if they're the same
            if (nativeName != englishName && nativeName.isNotEmpty()) {
                "$englishName ($nativeName)"
            } else {
                englishName
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting display name for $languageCode", e)
            languageCode // Fallback to just the code
        }
    }

    /**
     * Restart the app to apply language changes - improved version to avoid unexpected closures
     */
    fun restartApp(context: Context) {
        try {
            // Get the launch intent more carefully
            val packageManager = context.packageManager
            val packageName = context.packageName

            val intent = packageManager.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                // Configure intent with appropriate flags
                intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

                // Add a small delay to ensure configuration is applied
                Handler(Looper.getMainLooper()).postDelayed({
                    context.startActivity(intent)

                    // Only finish if it's an Activity
                    if (context is Activity) {
                        context.finish()
                    }
                }, 200) // 200ms delay
            } else {
                // Fallback in case we can't get the launch intent
                val mainIntent = Intent(Intent.ACTION_MAIN)
                mainIntent.addCategory(Intent.CATEGORY_LAUNCHER)
                mainIntent.setPackage(packageName)
                mainIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK or Intent.FLAG_ACTIVITY_NEW_TASK)

                val resolveInfos = packageManager.queryIntentActivities(mainIntent, 0)
                if (resolveInfos.isNotEmpty()) {
                    val resolveInfo = resolveInfos[0]
                    val activityInfo = resolveInfo.activityInfo
                    val componentName = ComponentName(activityInfo.packageName, activityInfo.name)

                    mainIntent.component = componentName
                    context.startActivity(mainIntent)

                    if (context is Activity) {
                        context.finish()
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to restart app: ${e.message}", e)
            // Do nothing else, allowing the application to continue running
        }
    }

    /**
     * Check if a language is supported by the system's text rendering
     */
    fun isLanguageSupported(languageCode: String): Boolean {
        return try {
            val locale = createLocaleFromCode(languageCode)
            val testString = "Test"
            val paint = android.graphics.Paint()
            true // If no exception occurs, assume support
        } catch (e: Exception) {
            Log.w(TAG, "Language $languageCode may not be fully supported: ${e.message}")
            // Still return true to allow the user to try it
            true
        }
    }
}

/**
 * Composable to manage language state with automatic updates
 */
@Composable
fun rememberLanguageState(
    initialLanguage: String? = null,
    onLanguageChanged: ((String) -> Unit)? = null,
    customToastMessage: ((String) -> String)? = null // Custom toast message formatter
): Pair<String, (String) -> Unit> {
    val context = LocalContext.current
    val localeManager = remember { LocaleManager.getInstance(context) }

    // Make sure language map is populated
    LaunchedEffect(Unit) {
        if (LocaleManager.availableLanguageCodeToName.isEmpty()) {
            localeManager.getAvailableLanguages()
        }
    }

    // Observe the current language from StateFlow
    val currentLang by localeManager.currentLanguage.collectAsState()

    // State to trigger UI updates
    var selectedLanguage by remember {
        mutableStateOf(initialLanguage ?: currentLang)
    }

    // Update the state when the Flow changes
    LaunchedEffect(currentLang) {
        selectedLanguage = currentLang
        onLanguageChanged?.invoke(currentLang)
    }

    // Function to change the language
    val changeLanguage: (String) -> Unit = { newLanguage ->
        // First update local state to immediately reflect the change in UI
        selectedLanguage = newLanguage

        // Then update the configuration, but handle restart more carefully
        if (localeManager.updateLocale(newLanguage)) {
            // Use a coroutine scope for the restart
            val activity = context as? Activity
            val currentContext = activity ?: context

            // Get the display name of the language
            val languageName = LocaleManager.availableLanguageCodeToName[newLanguage] ?: newLanguage

            // Show a Toast to inform the user
            val toastMessage = customToastMessage?.invoke(languageName)
                ?: "Changing language to $languageName..."

            Toast.makeText(
                context,
                toastMessage,
                Toast.LENGTH_SHORT
            ).show()

            // Restart with a small delay
            Handler(Looper.getMainLooper()).postDelayed({
                localeManager.restartApp(currentContext)
            }, 500)  // Give time for the Toast to show
        } else {
            // Notify error
            Toast.makeText(
                context,
                "Failed to update language. Please try again.",
                Toast.LENGTH_SHORT
            ).show()
            // Revert the local state
            selectedLanguage = currentLang
        }
    }

    // Clean up when this composable leaves composition
    DisposableEffect(Unit) {
        onDispose {
            // No special cleanup needed for now
        }
    }

    return selectedLanguage to changeLanguage
}

/**
 * Base Application class that applies the saved locale
 * Extend your Application class from this one
 */
abstract class ComposeLocaleAwareApplication : android.app.Application() {
    override fun attachBaseContext(base: Context) {
        // Apply the saved locale to the application context
        val localeManager = LocaleManager.getInstance(base)
        val localeUpdatedContext = localeManager.applyLocaleToContext(base)
        super.attachBaseContext(localeUpdatedContext)
    }

    override fun onCreate() {
        super.onCreate()
        // Initialize locale manager
        LocaleManager.getInstance(this)
    }
}

@Composable
fun LanguagePreference() {
    val context = LocalContext.current
    val localeManager = remember { LocaleManager.getInstance(context) }

    // Make sure languages are loaded
    LaunchedEffect(Unit) {
        localeManager.getAvailableLanguages()
    }

    // Get language state
    val (selectedLanguage, setSelectedLanguage) = rememberLanguageState(
        // You can customize the toast message if needed
        customToastMessage = { langName -> "Cambiando idioma a $langName..." }
    )

    // Replace with your actual R.string references
    ListPreference(
        title = { Text("Idioma de la aplicación") },  // Use stringResource(R.string.app_language) in your code
        icon = { Icon(painterResource(R.drawable.translate), null) },
        selectedValue = selectedLanguage,
        values = LocaleManager.availableLanguageCodeToName.keys.toList(),
        valueText = { LocaleManager.availableLanguageCodeToName[it] ?: "Predeterminado del sistema" },
        onValueSelected = { newLanguage ->
            // Simply call the setter function - the rest is handled internally
            setSelectedLanguage(newLanguage)
        }
    )
}

/**
 * Define your own extension functions to simplify working with the LocaleManager
 */
object LocaleUtils {
    /**
     * Get a string resource with the current locale
     */
    fun Context.getLocalizedString(resId: Int): String {
        val localeManager = LocaleManager.getInstance(this)
        val locale = localeManager.createLocaleFromCode(localeManager.getSelectedLanguageCode())

        val config = Configuration(Resources.getSystem().configuration)
        config.setLocale(locale)

        val localizedResources = createConfigurationContext(config).resources
        return localizedResources.getString(resId)
    }

    /**
     * Get the display name of the current language
     */
    fun Context.getCurrentLanguageDisplayName(): String {
        val localeManager = LocaleManager.getInstance(this)
        val currentLang = localeManager.getSelectedLanguageCode()
        return LocaleManager.availableLanguageCodeToName[currentLang] ?: currentLang
    }

    /**
     * Set the language, with restart handling
     */
    fun Activity.setLanguage(languageCode: String) {
        val localeManager = LocaleManager.getInstance(this)
        if (localeManager.updateLocale(languageCode)) {
            Toast.makeText(
                this,
                "Cambiando idioma a ${LocaleManager.availableLanguageCodeToName[languageCode] ?: languageCode}...",
                Toast.LENGTH_SHORT
            ).show()

            Handler(Looper.getMainLooper()).postDelayed({
                localeManager.restartApp(this)
            }, 500)
        }
    }
}