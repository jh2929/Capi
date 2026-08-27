package com.capi.music.tv

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.view.KeyEvent
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.lifecycle.lifecycleScope
import com.capi.music.LocalDatabase
import com.capi.music.LocalDownloadUtil
import com.capi.music.LocalPlayerConnection
import com.capi.music.LocalSyncUtils
import com.capi.music.db.MusicDatabase
import com.capi.music.playback.DownloadUtil
import com.capi.music.playback.MusicService
import com.capi.music.playback.MusicService.MusicBinder
import com.capi.music.playback.PlayerConnection
import com.capi.music.utils.SyncUtils
import com.capi.music.ui.theme.CapiTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class TvMainActivity : ComponentActivity() {
    @Inject
    lateinit var database: MusicDatabase

    @Inject
    lateinit var downloadUtil: DownloadUtil

    @Inject
    lateinit var syncUtils: SyncUtils

    private var playerConnection by mutableStateOf<PlayerConnection?>(null)
    private var isMusicServiceBound = false

    private val serviceConnection =
        object : ServiceConnection {
            override fun onServiceConnected(
                name: ComponentName?,
                service: IBinder?,
            ) {
                isMusicServiceBound = true
                if (service is MusicBinder) {
                    playerConnection =
                        PlayerConnection(this@TvMainActivity, service, database, lifecycleScope)
                }
            }

            override fun onServiceDisconnected(name: ComponentName?) {
                isMusicServiceBound = false
                playerConnection?.dispose()
                playerConnection = null
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            CompositionLocalProvider(
                LocalDatabase provides database,
                LocalPlayerConnection provides playerConnection,
                LocalDownloadUtil provides downloadUtil,
                LocalSyncUtils provides syncUtils,
            ) {
                CapiTheme(darkTheme = true) {
                    TvApp(backStack = rememberTvBackStack())
                }
            }
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    override fun onStart() {
        super.onStart()
        runCatching { startService(Intent(this, MusicService::class.java)) }
        isMusicServiceBound =
            bindService(
                Intent(this, MusicService::class.java),
                serviceConnection,
                Context.BIND_AUTO_CREATE,
            )
    }

    override fun onStop() {
        safeUnbindMusicService()
        super.onStop()
    }

    override fun onDestroy() {
        super.onDestroy()
        if (isMusicServiceBound) safeUnbindMusicService()
        playerConnection?.dispose()
        playerConnection = null
    }

    private fun safeUnbindMusicService() {
        if (!isMusicServiceBound) return
        try {
            unbindService(serviceConnection)
        } catch (_: IllegalArgumentException) {
        } finally {
            isMusicServiceBound = false
        }
    }

    private fun hideSystemBars() {
        val window = window
        window.statusBarColor = Color.Black.toArgb()
        window.navigationBarColor = Color.Black.toArgb()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.hide(androidx.core.view.WindowInsetsCompat.Type.systemBars())
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility =
                window.decorView.systemUiVisibility or
                    android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                    android.view.View.SYSTEM_UI_FLAG_FULLSCREEN or
                    android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
        }
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        val connection = playerConnection
        if (connection != null) {
            val handled =
                when (event.keyCode) {
                    KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE, KeyEvent.KEYCODE_HEADSETHOOK ->
                        if (event.action == KeyEvent.ACTION_DOWN) {
                            connection.player.playWhenReady = !connection.player.playWhenReady
                            true
                        } else {
                            true
                        }

                    KeyEvent.KEYCODE_MEDIA_PLAY ->
                        if (event.action == KeyEvent.ACTION_DOWN) {
                            connection.player.playWhenReady = true
                            true
                        } else {
                            false
                        }

                    KeyEvent.KEYCODE_MEDIA_PAUSE ->
                        if (event.action == KeyEvent.ACTION_DOWN) {
                            connection.player.playWhenReady = false
                            true
                        } else {
                            false
                        }

                    KeyEvent.KEYCODE_MEDIA_NEXT ->
                        if (event.action == KeyEvent.ACTION_DOWN) {
                            connection.seekToNext()
                            true
                        } else {
                            false
                        }

                    KeyEvent.KEYCODE_MEDIA_PREVIOUS ->
                        if (event.action == KeyEvent.ACTION_DOWN) {
                            connection.seekToPrevious()
                            true
                        } else {
                            false
                        }

                    KeyEvent.KEYCODE_MEDIA_STOP ->
                        if (event.action == KeyEvent.ACTION_DOWN) {
                            connection.player.playWhenReady = false
                            true
                        } else {
                            false
                        }

                    else -> false
                }
            if (handled) return true
        }
        return super.dispatchKeyEvent(event)
    }
}