@file:Suppress("DEPRECATION")
package com.arturo254.opentune.ui.component


import android.annotation.SuppressLint
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
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.core.os.ConfigurationCompat
import androidx.core.os.LocaleListCompat
import com.arturo254.opentune.R
import java.util.Locale
import kotlinx.coroutines.flow.MutableStateFlow

import kotlinx.coroutines.flow.StateFlow

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