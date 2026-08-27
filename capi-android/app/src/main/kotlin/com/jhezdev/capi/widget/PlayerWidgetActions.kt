/*
 * Capi Project Original (2026)
 * Jhezdev (github.com/Jhezdev)
 * Licensed Under GPL-3.0 | see git history for contributors
 */

package com.jhezdev.capi.widget

import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import com.jhezdev.capi.MainActivity
import com.jhezdev.capi.playback.MusicService

object PlayerWidgetActions {
    const val ACTION_PLAY_PAUSE = "com.jhezdev.capi.widget.action.PLAY_PAUSE"
    const val ACTION_NEXT = "com.jhezdev.capi.widget.action.NEXT"
    const val ACTION_PREVIOUS = "com.jhezdev.capi.widget.action.PREVIOUS"
    const val ACTION_REFRESH = "com.jhezdev.capi.widget.action.REFRESH"

    fun serviceIntent(context: Context, action: String): Intent =
        Intent(context, MusicService::class.java).setAction(action)

    fun openAppIntent(context: Context): Intent =
        Intent(context, MainActivity::class.java)
            .setAction(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_LAUNCHER)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)

    fun sendServiceAction(context: Context, action: String) {
        ContextCompat.startForegroundService(context, serviceIntent(context, action))
    }
}

class PlayPauseWidgetAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) {
        PlayerWidgetActions.sendServiceAction(context, PlayerWidgetActions.ACTION_PLAY_PAUSE)
    }
}

class NextWidgetAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) {
        PlayerWidgetActions.sendServiceAction(context, PlayerWidgetActions.ACTION_NEXT)
    }
}

class PreviousWidgetAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) {
        PlayerWidgetActions.sendServiceAction(context, PlayerWidgetActions.ACTION_PREVIOUS)
    }
}
