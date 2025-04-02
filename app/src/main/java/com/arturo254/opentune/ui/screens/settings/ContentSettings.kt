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

// Obtener el estado de idioma usando el nuevo método
        val (selectedLanguage, setSelectedLanguage) = rememberLanguageState()

        ListPreference(
            title = { Text(stringResource(R.string.app_language)) },
            icon = { Icon(painterResource(R.drawable.language), null) },
            selectedValue = selectedLanguage,
            values = LanguageCodeToName.keys.toList(),
            valueText = { LanguageCodeToName[it] ?: stringResource(R.string.system_default) },
            onValueSelected = { newLanguage ->
                // Simplemente llama a la función setter - el resto se maneja internamente
                setSelectedLanguage(newLanguage)
            }
        )

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
 */
class LocaleManager(private val context: Context) {

    companion object {
        private const val TAG = "LocaleManager"
        private const val PREF_NAME = "LocalePreferences"
        private const val PREF_LANGUAGE_KEY = "selected_language"

        // Languages that require special script handling
        private val COMPLEX_SCRIPT_LANGUAGES = setOf(
            "ne", "mr", "hi", "bn", "pa", "gu", "ta", "te", "kn", "ml",
            "si", "th", "lo", "my", "ka", "am", "km",
            "zh-CN", "zh-TW", "zh-HK", "ja", "ko"
        )

        // Singleton instance
        @Volatile private var instance: LocaleManager? = null

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

    /**
     * Get the currently selected language code
     */
    fun getSelectedLanguageCode(): String {
        return sharedPreferences.getString(PREF_LANGUAGE_KEY, getSystemLanguageCode()) ?: getSystemLanguageCode()
    }

    /**
     * Get the system default language code
     */
    private fun getSystemLanguageCode(): String {
        val localeList = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            ConfigurationCompat.getLocales(Resources.getSystem().configuration)
        } else {
            LocaleListCompat.create(Locale.getDefault())
        }

        return if (localeList.isEmpty) "en" else localeList[0]?.language ?: "en"
    }

    /**
     * Update the locale synchronously (for Compose compatibility)
     * @param languageCode The language code to set
     * @return true if successful, false otherwise
     */
    fun updateLocale(languageCode: String): Boolean {
        try {
            // Save preference
            sharedPreferences.edit().putString(PREF_LANGUAGE_KEY, languageCode).apply()
            _currentLanguage.value = languageCode

            val locale = createLocaleFromCode(languageCode)
            // Crear una nueva instancia de Configuration en lugar de clonar
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

    /**
     * Apply locale to a context
     */
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

    /**
     * Creates a Locale object from a language code
     */
    private fun createLocaleFromCode(languageCode: String): Locale {
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

    /**
     * Get the appropriate script for complex languages
     */
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

    /**
     * Set locale for Android N and above
     */
    private fun setLocaleApi24(config: Configuration, locale: Locale) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val localeList = LocaleList(locale)
            LocaleList.setDefault(localeList)
            config.setLocales(localeList)
        }
    }

    /**
     * Set locale for Android versions below N
     */
    @Suppress("DEPRECATION")
    private fun setLocaleLegacy(config: Configuration, locale: Locale) {
        config.locale = locale
    }

    /**
     * Restart the app to apply language changes
     */
    /**
     * Restart the app to apply language changes
     * Versión corregida para evitar cierres inesperados
     */
    fun restartApp(context: Context) {
        try {
            // Obtener el intent de inicio con más cuidado
            val packageManager = context.packageManager
            val packageName = context.packageName

            val intent = packageManager.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                // Configurar intent con banderas apropiadas
                intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

                // Agregamos un pequeño retraso para asegurar que la configuración se aplique
                Handler(Looper.getMainLooper()).postDelayed({
                    context.startActivity(intent)

                    // Solo finalizamos si es una Activity
                    if (context is Activity) {
                        context.finish()
                    }
                }, 100) // 100ms de retraso
            } else {
                // Fallback en caso de que no se pueda obtener el intent de inicio
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
            Log.e("LocaleManager", "Failed to restart app: ${e.message}", e)
            // No hacemos nada más, permitiendo que la aplicación continúe funcionando
        }
    }
}

/**
 * Dictionary mapping language codes to their display names
 * Extended with more languages and native names
 */
val LanguageCodeToName = mapOf(
    "ar" to "Arabic (العربية)",
    "be" to "Belarusian (Беларуская)",
    "zh-CN" to "Chinese Simplified (简体中文)",
    "zh-TW" to "Chinese Traditional (繁體中文)",
    "cs" to "Czech (Čeština)",
    "nl" to "Dutch (Nederlands)",
    "en" to "English",
    "fr" to "French (Français)",
    "de" to "German (Deutsch)",
    "hi" to "Hindi (हिन्दी)",
    "id" to "Indonesian (Bahasa Indonesia)",
    "it" to "Italian (Italiano)",
    "ja" to "Japanese (日本語)",
    "ko" to "Korean (한국어)",
    "pt-BR" to "Portuguese - Brazil (Português)",
    "ru" to "Russian (Русский)",
    "es" to "Spanish (Español)",
    "tr" to "Turkish (Türkçe)",
    "uk" to "Ukrainian (Українська)",
    "vi" to "Vietnamese (Tiếng Việt)"
)

@Composable
fun rememberLanguageState(
    initialLanguage: String? = null
): Pair<String, (String) -> Unit> {
    val context = LocalContext.current
    val localeManager = remember { LocaleManager.getInstance(context) }
    var selectedLanguage by remember {
        mutableStateOf(initialLanguage ?: localeManager.getSelectedLanguageCode())
    }

    return selectedLanguage to { newLanguage ->
        // Primero actualizamos el estado local para reflejar inmediatamente el cambio en la UI
        selectedLanguage = newLanguage

        // Luego actualizamos la configuración, pero manejamos el reinicio con más cuidado
        if (localeManager.updateLocale(newLanguage)) {
            // Utilizamos un coroutine scope para el reinicio
            val activity = context as? Activity
            val currentContext = activity ?: context

            // Mostramos un Toast para informar al usuario
            Toast.makeText(
                context,
                "Changing language to ${LanguageCodeToName[newLanguage] ?: newLanguage}...",
                Toast.LENGTH_SHORT
            ).show()

            // Reiniciamos con un pequeño retraso
            Handler(Looper.getMainLooper()).postDelayed({
                localeManager.restartApp(currentContext)
            }, 500)  // Damos tiempo para que el Toast se muestre
        } else {
            // Notificamos error
            Toast.makeText(
                context,
                "Failed to update language. Please try again.",
                Toast.LENGTH_SHORT
            ).show()
        }
    }
}

/**
 * Base Application class that applies the saved locale
 * Extend your Application class from this one
 */
abstract class ComposeLocaleAwareApplication : android.app.Application() {
    override fun attachBaseContext(base: Context) {
        // Apply the saved locale to the application context
        val localeManager = LocaleManager(base)
        val localeUpdatedContext = localeManager.applyLocaleToContext(base)
        super.attachBaseContext(localeUpdatedContext)
    }

    override fun onCreate() {
        super.onCreate()
        // Initialize locale manager
        LocaleManager.getInstance(this)
    }
}
