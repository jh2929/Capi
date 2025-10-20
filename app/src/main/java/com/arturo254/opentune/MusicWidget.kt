package com.arturo254.opentune

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
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
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var runnable: Runnable
    private var isUpdating = false

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

    private fun startProgressUpdater(context: Context) {
        if (isUpdating) return

        isUpdating = true
        runnable = Runnable {
            updateAllWidgets(context)
            handler.postDelayed(runnable, 1000)
        }
        handler.post(runnable)
    }

    private fun stopProgressUpdater() {
        isUpdating = false
        handler.removeCallbacks(runnable)
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

        fun updateAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val widgetIds = appWidgetManager.getAppWidgetIds(
                ComponentName(context, MusicWidget::class.java)
            )
            widgetIds.forEach { updateWidget(context, appWidgetManager, it) }
        }

        private fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_music)
            val playerConnection = PlayerConnection.instance
            val player = playerConnection?.player

            player?.let { player ->
                // Información de la canción
                val songTitle = player.mediaMetadata.title?.toString()
                    ?: context.getString(R.string.song_title)
                val artist = player.mediaMetadata.artist?.toString()
                    ?: context.getString(R.string.artist_name)

                views.setTextViewText(R.id.widget_song_title, songTitle)
                views.setTextViewText(R.id.widget_artist, artist)

                // Controles
                val playPauseIcon = if (player.playWhenReady) R.drawable.pause else R.drawable.play
                views.setImageViewResource(R.id.widget_play_pause, playPauseIcon)

                val shuffleIcon = if (player.shuffleModeEnabled) R.drawable.shuffle_on else R.drawable.shuffle
                views.setImageViewResource(R.id.widget_shuffle, shuffleIcon)

                val likeIcon = if (playerConnection.isCurrentSongLiked())
                    R.drawable.favorite else R.drawable.favorite_border
                views.setImageViewResource(R.id.widget_like, likeIcon)

                // Progress y tiempos
                val currentPos = player.currentPosition
                val duration = player.duration
                val currentTimeText = formatTime(currentPos)
                val durationText = formatTime(duration)

                views.setTextViewText(R.id.widget_current_time, currentTimeText)
                views.setTextViewText(R.id.widget_duration, durationText)

                // Progress bar
                val progress = if (duration > 0) {
                    (currentPos * 100 / duration).toInt()
                } else 0
                views.setProgressBar(R.id.widget_progress_bar, 100, progress, false)

                // Estado de reproducción
                val playbackStateText = when {
                    player.repeatMode == Player.REPEAT_MODE_ONE -> context.getString(R.string.repeat_mode_one)
                    player.repeatMode == Player.REPEAT_MODE_ALL -> context.getString(R.string.repeat_mode_all)
                    else -> ""
                }

                if (playbackStateText.isNotEmpty()) {
                    views.setTextViewText(R.id.widget_playback_state, playbackStateText)
                    views.setViewVisibility(R.id.widget_playback_state, android.view.View.VISIBLE)
                } else {
                    views.setViewVisibility(R.id.widget_playback_state, android.view.View.GONE)
                }

                // Album art con manejo de errores mejorado
                val thumbnailUrl = player.mediaMetadata.artworkUri?.toString()
                if (!thumbnailUrl.isNullOrEmpty()) {
                    CoroutineScope(Dispatchers.IO).launch {
                        try {
                            val request = ImageRequest.Builder(context)
                                .data(thumbnailUrl)
                                .size(160, 160) // Optimizado para el widget
                                .build()
                            val drawable = ImageLoader(context).execute(request).drawable
                            drawable?.let {
                                views.setImageViewBitmap(R.id.widget_album_art, it.toBitmap())
                                appWidgetManager.partiallyUpdateAppWidget(appWidgetId, views)
                            }
                        } catch (e: Exception) {
                            // Fallback a imagen por defecto
                            views.setImageViewResource(R.id.widget_album_art, R.drawable.music_note)
                            appWidgetManager.partiallyUpdateAppWidget(appWidgetId, views)
                        }
                    }
                } else {
                    views.setImageViewResource(R.id.widget_album_art, R.drawable.music_note)
                }
            }

            // Pending Intents
            setPendingIntents(context, views)

            // Actualizar widget
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun setPendingIntents(context: Context, views: RemoteViews) {
            val playPausePendingIntent = getBroadcastPendingIntent(context, ACTION_PLAY_PAUSE)
            val prevPendingIntent = getBroadcastPendingIntent(context, ACTION_PREV)
            val nextPendingIntent = getBroadcastPendingIntent(context, ACTION_NEXT)
            val shufflePendingIntent = getBroadcastPendingIntent(context, ACTION_SHUFFLE)
            val likePendingIntent = getBroadcastPendingIntent(context, ACTION_LIKE)

            views.setOnClickPendingIntent(R.id.widget_play_pause, playPausePendingIntent)
            views.setOnClickPendingIntent(R.id.widget_prev, prevPendingIntent)
            views.setOnClickPendingIntent(R.id.widget_next, nextPendingIntent)
            views.setOnClickPendingIntent(R.id.widget_shuffle, shufflePendingIntent)
            views.setOnClickPendingIntent(R.id.widget_like, likePendingIntent)

            // Click en el album art también reproduce/pausa
            views.setOnClickPendingIntent(R.id.widget_album_art, playPausePendingIntent)
        }

        private fun getBroadcastPendingIntent(context: Context, action: String): PendingIntent {
            val intent = Intent(context, MusicWidget::class.java).apply {
                this.action = action
            }

            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

            return PendingIntent.getBroadcast(context, action.hashCode(), intent, flags)
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
    }
}