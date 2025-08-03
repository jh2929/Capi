@file:Suppress("DEPRECATION")

package com.arturo254.opentune.ui.component

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.content.res.Resources
import android.os.Build
import android.os.Handler
import android.os.LocaleList
import android.os.Looper
import android.util.Log
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.os.ConfigurationCompat
import androidx.core.os.LocaleListCompat
import com.arturo254.opentune.R
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.util.Locale


/**
 * Modelo de datos para representar un idioma
 */
data class LanguageItem(
    val code: String,
    val displayName: String,
    val nativeName: String,
    val completionStatus: CompletionStatus = CompletionStatus.COMPLETE,
    val isSystemDefault: Boolean = false
)

/**
 * Estado de completitud de las traducciones
 */
enum class CompletionStatus(val label: String, val color: Color) {
    COMPLETE("", Color.Transparent),
    INCOMPLETE("Traducción incompleta", Color(0xFFFF9800)),
    BETA("BETA", Color(0xFF2196F3)),
    EXPERIMENTAL("Experimental", Color(0xFF9C27B0))
}

/**
 * LocaleManager mejorado con mejor arquitectura y UX
 */
class LocaleManager private constructor(private val context: Context) {

    companion object {
        private const val TAG = "LocaleManager"
        private const val PREF_NAME = "locale_preferences"
        private const val PREF_LANGUAGE_KEY = "selected_language"
        private const val SYSTEM_DEFAULT = "system_default"

        @Volatile
        private var instance: LocaleManager? = null

        fun getInstance(context: Context): LocaleManager {
            return instance ?: synchronized(this) {
                instance ?: LocaleManager(context.applicationContext).also { instance = it }
            }
        }

        // Configuración de idiomas con su estado de completitud
        private val LANGUAGE_CONFIG = mapOf(
            "system_default" to Triple("Sistema", "", CompletionStatus.COMPLETE),
            "en" to Triple("English", "English", CompletionStatus.COMPLETE),
            "es" to Triple("Spanish", "Español", CompletionStatus.COMPLETE),
            "fr" to Triple("French", "Français", CompletionStatus.COMPLETE),
            "de" to Triple("German", "Deutsch", CompletionStatus.COMPLETE),
            "it" to Triple("Italian", "Italiano", CompletionStatus.COMPLETE),
            "pt-BR" to Triple("Portuguese (Brazil)", "Português (Brasil)", CompletionStatus.COMPLETE),
            "ru" to Triple("Russian", "Русский", CompletionStatus.COMPLETE),
            "zh-CN" to Triple("Chinese (Simplified)", "简体中文", CompletionStatus.COMPLETE),
            "zh-TW" to Triple("Chinese (Traditional)", "繁體中文", CompletionStatus.COMPLETE),
            "ja" to Triple("Japanese", "日本語", CompletionStatus.COMPLETE),
            "ko" to Triple("Korean", "한국어", CompletionStatus.COMPLETE),
            "ar" to Triple("Arabic", "العربية", CompletionStatus.BETA),
            "hi" to Triple("Hindi", "हिन्दी", CompletionStatus.BETA),
            "th" to Triple("Thai", "ไทย", CompletionStatus.INCOMPLETE),
            "vi" to Triple("Vietnamese", "Tiếng Việt", CompletionStatus.INCOMPLETE),
            "tr" to Triple("Turkish", "Türkçe", CompletionStatus.BETA),
            "pl" to Triple("Polish", "Polski", CompletionStatus.INCOMPLETE),
            "nl" to Triple("Dutch", "Nederlands", CompletionStatus.INCOMPLETE),
            "sv" to Triple("Swedish", "Svenska", CompletionStatus.INCOMPLETE),
            "da" to Triple("Danish", "Dansk", CompletionStatus.INCOMPLETE),
            "no" to Triple("Norwegian", "Norsk", CompletionStatus.INCOMPLETE),
            "fi" to Triple("Finnish", "Suomi", CompletionStatus.EXPERIMENTAL),
            "hu" to Triple("Hungarian", "Magyar", CompletionStatus.EXPERIMENTAL),
            "cs" to Triple("Czech", "Čeština", CompletionStatus.EXPERIMENTAL),
            "sk" to Triple("Slovak", "Slovenčina", CompletionStatus.EXPERIMENTAL),
            "uk" to Triple("Ukrainian", "Українська", CompletionStatus.BETA),
            "he" to Triple("Hebrew", "עברית", CompletionStatus.BETA),
            "fa" to Triple("Persian", "فارسی", CompletionStatus.EXPERIMENTAL),
            "bn" to Triple("Bengali", "বাংলা", CompletionStatus.EXPERIMENTAL),
            "ta" to Triple("Tamil", "தமிழ்", CompletionStatus.EXPERIMENTAL),
            "te" to Triple("Telugu", "తెలుగు", CompletionStatus.EXPERIMENTAL),
            "ml" to Triple("Malayalam", "മലയാളം", CompletionStatus.EXPERIMENTAL),
            "kn" to Triple("Kannada", "ಕನ್ನಡ", CompletionStatus.EXPERIMENTAL),
            "gu" to Triple("Gujarati", "ગુજરાતી", CompletionStatus.EXPERIMENTAL),
            "pa" to Triple("Punjabi", "ਪੰਜਾਬੀ", CompletionStatus.EXPERIMENTAL),
            "mr" to Triple("Marathi", "मराठी", CompletionStatus.EXPERIMENTAL),
            "ne" to Triple("Nepali", "नेपाली", CompletionStatus.EXPERIMENTAL),
            "si" to Triple("Sinhala", "සිංහල", CompletionStatus.EXPERIMENTAL),
            "my" to Triple("Myanmar", "မြန်မာ", CompletionStatus.EXPERIMENTAL),
            "km" to Triple("Khmer", "ខ្មែរ", CompletionStatus.EXPERIMENTAL),
            "lo" to Triple("Lao", "ລາວ", CompletionStatus.EXPERIMENTAL),
            "ka" to Triple("Georgian", "ქართული", CompletionStatus.EXPERIMENTAL),
            "am" to Triple("Amharic", "አማርኛ", CompletionStatus.EXPERIMENTAL),
            "id" to Triple("Indonesian", "Bahasa Indonesia", CompletionStatus.BETA),
            "ms" to Triple("Malay", "Bahasa Melayu", CompletionStatus.EXPERIMENTAL),
            "tl" to Triple("Filipino", "Filipino", CompletionStatus.EXPERIMENTAL),
            "sw" to Triple("Swahili", "Kiswahili", CompletionStatus.EXPERIMENTAL),
            "zu" to Triple("Zulu", "isiZulu", CompletionStatus.EXPERIMENTAL),
            "af" to Triple("Afrikaans", "Afrikaans", CompletionStatus.EXPERIMENTAL)
        )
    }

    private val sharedPreferences = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    private val _currentLanguage = MutableStateFlow(getSelectedLanguageCode())
    private val _isChangingLanguage = MutableStateFlow(false)

    val currentLanguage: StateFlow<String> = _currentLanguage
    val isChangingLanguage: StateFlow<Boolean> = _isChangingLanguage

    /** Obtiene el código de idioma seleccionado por el usuario */
    fun getSelectedLanguageCode(): String {
        return sharedPreferences.getString(PREF_LANGUAGE_KEY, SYSTEM_DEFAULT) ?: SYSTEM_DEFAULT
    }

    /** Obtiene el código de idioma efectivo (resuelve system_default) */
    fun getEffectiveLanguageCode(): String {
        val saved = getSelectedLanguageCode()
        return if (saved == SYSTEM_DEFAULT) getSystemLanguageCode() else saved
    }

    /** Obtiene el código de idioma del sistema */
    private fun getSystemLanguageCode(): String {
        return try {
            val localeList = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                ConfigurationCompat.getLocales(Resources.getSystem().configuration)
            } else {
                LocaleListCompat.create(Locale.getDefault())
            }

            val systemLocale = if (localeList.isEmpty) Locale.getDefault() else localeList[0]
                ?: Locale.getDefault()
            val language = systemLocale.language
            val country = systemLocale.country

            when {
                language == "zh" && country.isNotEmpty() -> {
                    when (country) {
                        "CN" -> "zh-CN"
                        "TW" -> "zh-TW"
                        "HK" -> "zh-TW"
                        else -> "zh-CN"
                    }
                }
                language == "pt" && country == "BR" -> "pt-BR"
                else -> language
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error obteniendo idioma del sistema", e)
            "en"
        }
    }

    /** Obtiene la lista de idiomas disponibles como objetos LanguageItem */
    fun getAvailableLanguages(): List<LanguageItem> {
        val systemLanguageCode = getSystemLanguageCode()
        val systemDisplayName = LANGUAGE_CONFIG[systemLanguageCode]?.second ?: systemLanguageCode

        return LANGUAGE_CONFIG.map { (code, config) ->
            LanguageItem(
                code = code,
                displayName = if (code == SYSTEM_DEFAULT) {
                    "Sistema ($systemDisplayName)"
                } else {
                    config.first
                },
                nativeName = if (code == SYSTEM_DEFAULT) {
                    systemDisplayName
                } else {
                    config.second
                },
                completionStatus = config.third,
                isSystemDefault = code == SYSTEM_DEFAULT
            )
        }.sortedWith(compareBy<LanguageItem> { !it.isSystemDefault }
            .thenBy { it.completionStatus.ordinal }
            .thenBy { it.displayName })
    }

    /** Actualiza el idioma de forma asíncrona con mejor UX */
    suspend fun updateLanguage(languageCode: String): Boolean {
        return try {
            _isChangingLanguage.value = true
            Log.d(TAG, "Cambiando idioma a: $languageCode")

            // Simular delay para mostrar animación
            delay(500)

            // Guardar preferencia ANTES de actualizar el estado
            sharedPreferences.edit().putString(PREF_LANGUAGE_KEY, languageCode).apply()

            // Actualizar el estado con el código guardado (no el efectivo)
            _currentLanguage.value = languageCode

            // Crear y aplicar locale con el código efectivo
            val effectiveLanguageCode = if (languageCode == SYSTEM_DEFAULT) {
                getSystemLanguageCode()
            } else {
                languageCode
            }

            val locale = createLocaleFromCode(effectiveLanguageCode)
            applyLocaleToApp(locale)

            Log.d(TAG, "Idioma actualizado exitosamente a: $languageCode (efectivo: $effectiveLanguageCode)")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error actualizando idioma a $languageCode", e)
            false
        } finally {
            _isChangingLanguage.value = false
        }
    }

    /** Aplica la configuración de idioma a la aplicación */
    private fun applyLocaleToApp(locale: Locale) {
        try {
            Locale.setDefault(locale)
            val config = Configuration(context.resources.configuration)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                val localeList = LocaleList(locale)
                LocaleList.setDefault(localeList)
                config.setLocales(localeList)
                config.setLocale(locale)
            } else {
                config.locale = locale
            }

            @Suppress("DEPRECATION")
            context.resources.updateConfiguration(config, context.resources.displayMetrics)
        } catch (e: Exception) {
            Log.e(TAG, "Error aplicando configuración de idioma", e)
        }
    }

    /** Aplica el idioma a un contexto específico */
    fun applyLocaleToContext(baseContext: Context): Context {
        return try {
            val languageCode = getEffectiveLanguageCode()
            val locale = createLocaleFromCode(languageCode)

            Locale.setDefault(locale)
            val config = Configuration(baseContext.resources.configuration)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                config.setLocale(locale)
                val localeList = LocaleList(locale)
                LocaleList.setDefault(localeList)
                config.setLocales(localeList)
                baseContext.createConfigurationContext(config)
            } else {
                config.locale = locale
                @Suppress("DEPRECATION")
                baseContext.resources.updateConfiguration(
                    config,
                    baseContext.resources.displayMetrics
                )
                baseContext
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error aplicando idioma al contexto", e)
            baseContext
        }
    }

    /** Crea un objeto Locale desde un código de idioma */
    private fun createLocaleFromCode(languageCode: String): Locale {
        return try {
            when {
                languageCode == "zh-CN" -> Locale.SIMPLIFIED_CHINESE
                languageCode == "zh-TW" -> Locale.TRADITIONAL_CHINESE
                languageCode.contains("-") -> {
                    val parts = languageCode.split("-", limit = 2)
                    if (parts.size >= 2) {
                        Locale(parts[0], parts[1])
                    } else {
                        Locale(parts[0])
                    }
                }
                else -> Locale(languageCode)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error creando Locale para: $languageCode", e)
            Locale(languageCode)
        }
    }

    /** Reinicia la aplicación con animación suave */
    fun restartApp(context: Context) {
        try {
            val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            intent?.let {
                it.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK or Intent.FLAG_ACTIVITY_NEW_TASK)
                Handler(Looper.getMainLooper()).postDelayed({
                    context.startActivity(it)
                    if (context is Activity) {
                        context.finish()
                        context.overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
                    }
                }, 1000)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reiniciando aplicación", e)
        }
    }
}

/** Composable principal para la selección de idioma con diseño minimalista */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LanguageSelector(
    modifier: Modifier = Modifier,
    onDismiss: () -> Unit = {}
) {
    val context = LocalContext.current
    val localeManager = remember { LocaleManager.getInstance(context) }
    val hapticFeedback = LocalHapticFeedback.current

    val currentLanguage by localeManager.currentLanguage.collectAsState()
    val isChangingLanguage by localeManager.isChangingLanguage.collectAsState()
    val availableLanguages by remember { derivedStateOf { localeManager.getAvailableLanguages() } }

    var selectedLanguageCode by remember { mutableStateOf<String?>(null) }
    val listState = rememberLazyListState()

    // LaunchedEffect para manejar el cambio de idioma
    LaunchedEffect(selectedLanguageCode) {
        selectedLanguageCode?.let { languageCode ->
            if (localeManager.updateLanguage(languageCode)) {
                delay(1500)
                localeManager.restartApp(context)
            }
            selectedLanguageCode = null
        }
    }

    // Scroll automático al idioma seleccionado
    LaunchedEffect(availableLanguages, currentLanguage) {
        val selectedIndex = availableLanguages.indexOfFirst { language ->
            language.code == currentLanguage
        }
        if (selectedIndex != -1) {
            listState.animateScrollToItem(selectedIndex)
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        modifier = Modifier.padding(WindowInsets.navigationBars.asPaddingValues()),
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(vertical = 8.dp)
                    .size(width = 32.dp, height = 4.dp)
                    .background(
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f),
                        shape = RoundedCornerShape(2.dp)
                    )
            )
        }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
        ) {
            // Header minimalista
            Text(
                text = stringResource(R.string.language),
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp)
            )

            // Indicador de carga minimalista
            AnimatedVisibility(
                visible = isChangingLanguage,
                enter = slideInVertically(
                    initialOffsetY = { -it / 2 },
                    animationSpec = spring(
                        dampingRatio = Spring.DampingRatioMediumBouncy,
                        stiffness = Spring.StiffnessMedium
                    )
                ) + fadeIn(),
                exit = slideOutVertically(
                    targetOffsetY = { -it / 2 },
                    animationSpec = spring(
                        dampingRatio = Spring.DampingRatioNoBouncy,
                        stiffness = Spring.StiffnessHigh
                    )
                ) + fadeOut()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = "Aplicando cambios...",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Lista de idiomas minimalista
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .fillMaxWidth()
                    .selectableGroup(),
                contentPadding = PaddingValues(horizontal = 24.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                items(
                    items = availableLanguages,
                    key = { it.code }
                ) { language ->
                    val isSelected = language.code == currentLanguage

                    LanguageItem(
                        language = language,
                        isSelected = isSelected,
                        isEnabled = !isChangingLanguage,
                        onClick = {
                            if (!isChangingLanguage && !isSelected) {
                                hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                                selectedLanguageCode = language.code
                            }
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

/** Composable minimalista para un elemento de idioma */
@Composable
private fun LanguageItem(
    language: LanguageItem,
    isSelected: Boolean,
    isEnabled: Boolean,
    onClick: () -> Unit
) {
    val animatedAlpha by animateFloatAsState(
        targetValue = if (isSelected) 1f else 0.7f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "alpha"
    )

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .animateContentSize(
                animationSpec = spring(
                    dampingRatio = Spring.DampingRatioMediumBouncy,
                    stiffness = Spring.StiffnessMedium
                )
            )
            .selectable(
                selected = isSelected,
                enabled = isEnabled,
                role = Role.RadioButton,
                onClick = onClick
            ),
        color = if (isSelected) {
            MaterialTheme.colorScheme.surfaceVariant
        } else {
            Color.Transparent
        },
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp, horizontal = 16.dp)
                .graphicsLayer { alpha = animatedAlpha },
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Radio button minimalista
            Box(
                modifier = Modifier.size(20.dp),
                contentAlignment = Alignment.Center
            ) {
                // Círculo exterior
                Box(
                    modifier = Modifier
                        .size(20.dp)
                        .border(
                            width = 2.dp,
                            color = if (isSelected) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.outline
                            },
                            shape = CircleShape
                        )
                )

                // Círculo interior animado
                this@Row.AnimatedVisibility(
                    visible = isSelected,
                    enter = scaleIn(
                        animationSpec = spring(
                            dampingRatio = Spring.DampingRatioMediumBouncy,
                            stiffness = Spring.StiffnessHigh
                        )
                    ) + fadeIn(),
                    exit = scaleOut(
                        animationSpec = spring(
                            dampingRatio = Spring.DampingRatioNoBouncy,
                            stiffness = Spring.StiffnessHigh
                        )
                    ) + fadeOut()
                ) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .background(
                                color = MaterialTheme.colorScheme.primary,
                                shape = CircleShape
                            )
                    )
                }

            }

            Spacer(modifier = Modifier.width(16.dp))

            // Información del idioma
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = language.displayName,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = if (isSelected) FontWeight.Medium else FontWeight.Normal,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                if (language.nativeName.isNotEmpty() &&
                    language.nativeName != language.displayName &&
                    !language.isSystemDefault
                ) {
                    Text(
                        text = language.nativeName,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 1.dp),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            // Badge de estado minimalista
            if (language.completionStatus != CompletionStatus.COMPLETE) {
                Text(
                    text = language.completionStatus.label,
                    style = MaterialTheme.typography.labelSmall,
                    color = language.completionStatus.color,
                    modifier = Modifier
                        .background(
                            color = language.completionStatus.color.copy(alpha = 0.1f),
                            shape = RoundedCornerShape(4.dp)
                        )
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        }
    }
}

/** Composable para integrar con las preferencias existentes - versión minimalista */
@Composable
fun LanguagePreference() {
    var showLanguageSelector by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val localeManager = remember { LocaleManager.getInstance(context) }
    val currentLanguage by localeManager.currentLanguage.collectAsState()

    val currentLanguageDisplay = remember(currentLanguage) {
        val selectedCode = localeManager.getSelectedLanguageCode()
        localeManager.getAvailableLanguages()
            .find { it.code == selectedCode }
            ?.displayName ?: selectedCode
    }

    // Preferencia minimalista
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { showLanguageSelector = true },
        color = Color.Transparent
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = stringResource(R.string.language),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Medium
                )

                Text(
                    text = currentLanguageDisplay,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }

            Icon(
                imageVector = Icons.Default.ArrowForward,
                contentDescription = "Cambiar idioma",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(16.dp)
            )
        }
    }

    if (showLanguageSelector) {
        LanguageSelector(
            onDismiss = { showLanguageSelector = false }
        )
    }
}

/** Application class mejorada */
abstract class LocaleAwareApplication : android.app.Application() {
    override fun attachBaseContext(base: Context) {
        val localeManager = LocaleManager.getInstance(base)
        val updatedContext = localeManager.applyLocaleToContext(base)
        super.attachBaseContext(updatedContext)
    }

    override fun onCreate() {
        super.onCreate()
        LocaleManager.getInstance(this)
    }
}