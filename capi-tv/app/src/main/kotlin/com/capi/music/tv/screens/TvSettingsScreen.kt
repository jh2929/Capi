package com.capi.music.tv.screens

import com.capi.music.tv.components.TvTextPrimary
import com.capi.music.tv.components.TvTextSecondary

import android.content.Context
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.capi.music.R
import com.capi.music.constants.AudioQuality
import com.capi.music.constants.AudioQualityKey
import com.capi.music.constants.WakelockKey
import com.capi.music.tv.components.TvSectionTitle
import com.capi.music.tv.components.tvFocusable
import com.capi.music.utils.dataStore
import com.capi.music.utils.get
import androidx.datastore.preferences.core.edit
import kotlinx.coroutines.launch

private val QualityOptions =
    listOf(
        AudioQuality.AUTO to "Auto",
        AudioQuality.LOW to "Low",
        AudioQuality.HIGH to "High",
        AudioQuality.HIGHEST to "Highest",
    )

@Composable
fun TvSettingsScreen(
    onBack: () -> Unit,
) {
    val context = LocalContext.current.applicationContext
    val scope = rememberCoroutineScope()
    val shape = MaterialTheme.shapes.extraLarge
    var quality by remember { mutableStateOf(readQuality(context)) }
    var wakelock by remember { mutableStateOf(readWakelock(context)) }

    Column(
        modifier =
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(start = 8.dp, top = 16.dp, end = 40.dp, bottom = 24.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(bottom = 10.dp),
        ) {
            Icon(
                imageVector = Icons.Rounded.ArrowBack,
                contentDescription = stringResource(R.string.tv_back),
                tint = TvTextPrimary,
                modifier =
                    Modifier
                        .tvFocusable(shape = MaterialTheme.shapes.large) { onBack() }
                        .padding(12.dp),
            )
            Text(
                text = stringResource(R.string.tv_back),
                style = MaterialTheme.typography.titleMedium,
                color = TvTextPrimary,
            )
        }

        TvSectionTitle(stringResource(R.string.tv_audio_quality))

        Row(
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.padding(start = 16.dp),
        ) {
            QualityOptions.forEach { (option, label) ->
                val selected = option == quality
                Text(
                    text = label,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                    color =
                        if (selected) MaterialTheme.colorScheme.primary
                        else TvTextSecondary,
                    modifier =
                        Modifier
                            .tvFocusable(
                                shape = MaterialTheme.shapes.large,
                                ringWidth = 2.dp,
                                onClick = {
                                    quality = option
                                    scope.launch {
                                        context.dataStore.edit { it[AudioQualityKey] = option.name }
                                    }
                                },
                            )
                            .padding(horizontal = 20.dp, vertical = 10.dp),
                )
            }
        }

        TvSectionTitle(stringResource(R.string.tv_playback))

        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier =
                Modifier
                    .fillMaxWidth()
                    .tvFocusable(
                        shape = MaterialTheme.shapes.medium,
                        ringWidth = 2.dp,
                        onClick = {
                            wakelock = !wakelock
                            scope.launch {
                                context.dataStore.edit { it[WakelockKey] = wakelock }
                            }
                        },
                    )
                    .padding(horizontal = 18.dp, vertical = 14.dp),
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    text = stringResource(R.string.tv_wakelock),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = stringResource(R.string.tv_wakelock_desc),
                    style = MaterialTheme.typography.bodyMedium,
                    color = TvTextSecondary,
                )
            }
            Switch(checked = wakelock, onCheckedChange = {})
        }

        TvSectionTitle(stringResource(R.string.tv_about))

        Column(modifier = Modifier.padding(start = 16.dp)) {
            Text(
                text = stringResource(R.string.app_name),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = stringResource(R.string.tv_about_desc),
                style = MaterialTheme.typography.bodyMedium,
                color = TvTextSecondary,
                modifier = Modifier.padding(top = 6.dp, end = 60.dp),
            )
        }
    }
}

private fun readQuality(context: Context): AudioQuality =
    try {
        AudioQuality.valueOf(context.dataStore[AudioQualityKey] ?: AudioQuality.AUTO.name)
    } catch (_: Exception) {
        AudioQuality.AUTO
    }

private fun readWakelock(context: Context): Boolean =
    context.dataStore[WakelockKey] ?: true