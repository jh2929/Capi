package com.arturo254.opentune

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import androidx.core.graphics.drawable.toBitmap
import androidx.media3.common.Player
import coil.ImageLoader
import coil.request.ImageRequest
import com.arturo254.opentune.playback.PlayerConnection
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit

class MusicWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { appWidgetId ->
            updateWidget(context, appWidgetManager, appWidgetId)
        }
        startProgressUpdater(context)
    }

    override fun onEnabled(context: Context) {
        startProgressUpdater(context)
    }

    override fun onDisabled(context: Context) {
        stopProgressUpdater()
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            ACTION_PLAY_PAUSE -> {
                PlayerConnection.instance?.togglePlayPause()
                abortBroadcast()
                updateAllWidgets(context)
            }
            ACTION_PREV -> {
                PlayerConnection.instance?.seekToPrevious()
                abortBroadcast()
                updateAllWidgets(context)
            }
            ACTION_NEXT -> {
                PlayerConnection.instance?.seekToNext()
                abortBroadcast()
                updateAllWidgets(context)
            }
            ACTION_SHUFFLE -> {
                PlayerConnection.instance?.toggleShuffle()
                abortBroadcast()
                updateAllWidgets(context)
            }
            ACTION_LIKE -> {
                PlayerConnection.instance?.toggleLike()
                abortBroadcast()
                updateAllWidgets(context)
            }
            ACTION_REPLAY -> {
                PlayerConnection.instance?.toggleReplayMode()
                abortBroadcast()
                updateAllWidgets(context)
            }
            ACTION_STATE_CHANGED, ACTION_UPDATE_PROGRESS -> {
                updateAllWidgets(context)
            }
        }
    }

    companion object {
        const val ACTION_PLAY_PAUSE = "com.Arturo254.opentune.ACTION_PLAY_PAUSE"
        const val ACTION_PREV = "com.Arturo254.opentune.ACTION_PREV"
        const val ACTION_NEXT = "com.Arturo254.opentune.ACTION_NEXT"
        const val ACTION_SHUFFLE = "com.Arturo254.opentune.ACTION_SHUFFLE"
        const val ACTION_LIKE = "com.Arturo254.opentune.ACTION_LIKE"
        const val ACTION_REPLAY = "com.Arturo254.opentune.ACTION_REPLAY"
        const val ACTION_STATE_CHANGED = "com.Arturo254.opentune.ACTION_STATE_CHANGED"
        const val ACTION_UPDATE_PROGRESS = "com.Arturo254.opentune.ACTION_UPDATE_PROGRESS"
        private var isProgressUpdaterRunning = false

        fun updateAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val widgetIds = appWidgetManager.getAppWidgetIds(
                ComponentName(context, MusicWidget::class.java)
            )
            widgetIds.forEach { updateWidget(context, appWidgetManager, it) }
        }

        @SuppressLint("RemoteViewLayout")
        private fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_music)
            val playerConnection = PlayerConnection.instance
            val player = playerConnection?.player

            player?.let { p ->
                // Título y artista
                views.setTextViewText(R.id.widget_track_title, p.mediaMetadata.title)
                views.setTextViewText(R.id.widget_artist, p.mediaMetadata.artist)

                // Icono Play / Pause
                val playPauseIcon = if (p.playWhenReady) R.drawable.pause else R.drawable.play
                views.setImageViewResource(R.id.widget_play_pause, playPauseIcon)

                // Icono Shuffle
                val shuffleIcon = if (p.shuffleModeEnabled) R.drawable.shuffle_on else R.drawable.shuffle
                views.setImageViewResource(R.id.widget_shuffle, shuffleIcon)

                // Icono Like (favorito)
                val likeIcon = if (p.mediaMetadata.extras?.getBoolean("isLiked", false) == true) {
                    R.drawable.favorite_border
                } else {
                    R.drawable.favorite
                }
                views.setImageViewResource(R.id.widget_like, likeIcon)

                // Color especial para el modo repetir 1
                if (p.repeatMode == Player.REPEAT_MODE_ONE) {
                    views.setInt(R.id.widget_play_pause, "setColorFilter", context.getColor(R.color.light_blue_50))
                } else {
                    views.setInt(R.id.widget_play_pause, "setColorFilter", context.getColor(android.R.color.transparent))
                }

                // Tiempos y progreso
                views.setTextViewText(R.id.widget_current_time, formatTime(p.currentPosition))
                views.setTextViewText(R.id.widget_total_time, formatTime(p.duration))

                val progress = if (p.duration > 0) {
                    (p.currentPosition * 100 / p.duration).toInt()
                } else 0
                views.setProgressBar(R.id.widget_progress, 100, progress, false)

                // Cargar portada del álbum (asíncrono)
                val thumbnailUrl = p.mediaMetadata.artworkUri?.toString()
                if (!thumbnailUrl.isNullOrEmpty()) {
                    CoroutineScope(Dispatchers.IO).launch {
                        try {
                            val request = ImageRequest.Builder(context)
                                .data(thumbnailUrl)
                                .build()
                            val drawable = ImageLoader(context).execute(request).drawable
                            drawable?.let {
                                views.setImageViewBitmap(R.id.widget_album_art, it.toBitmap())
                                appWidgetManager.updateAppWidget(appWidgetId, views)
                            }
                        } catch (e: Exception) {
                            views.setImageViewResource(R.id.widget_album_art, R.drawable.album)
                            appWidgetManager.updateAppWidget(appWidgetId, views)
                        }
                    }
                } else {
                    views.setImageViewResource(R.id.widget_album_art, R.drawable.album)
                }
            }

            // Asignar acciones a botones
            views.setOnClickPendingIntent(R.id.widget_play_pause, getPendingIntent(context, ACTION_PLAY_PAUSE))
            views.setOnClickPendingIntent(R.id.widget_prev, getPendingIntent(context, ACTION_PREV))
            views.setOnClickPendingIntent(R.id.widget_next, getPendingIntent(context, ACTION_NEXT))
            views.setOnClickPendingIntent(R.id.widget_shuffle, getPendingIntent(context, ACTION_SHUFFLE))
            views.setOnClickPendingIntent(R.id.widget_like, getPendingIntent(context, ACTION_LIKE))

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }


        private fun getPendingIntent(context: Context, action: String): PendingIntent {
            val intent = Intent(context, MusicWidget::class.java).apply {
                this.action = action
                flags = Intent.FLAG_RECEIVER_FOREGROUND
            }
            return PendingIntent.getBroadcast(
                context,
                action.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        @SuppressLint("DefaultLocale")
        private fun formatTime(millis: Long): String {
            return if (millis < 0) "0:00" else String.format(
                "%d:%02d",
                TimeUnit.MILLISECONDS.toMinutes(millis),
                TimeUnit.MILLISECONDS.toSeconds(millis) -
                        TimeUnit.MINUTES.toSeconds(TimeUnit.MILLISECONDS.toMinutes(millis))
            )
        }

        fun startProgressUpdater(context: Context) {
            if (isProgressUpdaterRunning) return

            isProgressUpdaterRunning = true
            CoroutineScope(Dispatchers.IO).launch {
                while (isProgressUpdaterRunning) {
                    try {
                        Thread.sleep(1000)
                        context.sendBroadcast(Intent(ACTION_UPDATE_PROGRESS).apply {
                            setPackage(context.packageName)
                        })
                    } catch (e: InterruptedException) {
                        break
                    }
                }
            }
        }
        fun stopProgressUpdater() {
            isProgressUpdaterRunning = false
        }
    }
}