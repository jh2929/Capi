package com.capi.music.tv

import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.capi.music.LocalPlayerConnection
import com.capi.music.tv.screens.TvAlbumScreen
import com.capi.music.tv.screens.TvAlbumsScreen
import com.capi.music.tv.screens.TvArtistScreen
import com.capi.music.tv.screens.TvArtistsScreen
import com.capi.music.tv.screens.TvHomeScreen
import com.capi.music.tv.screens.TvLibraryScreen
import com.capi.music.tv.screens.TvPlaylistScreen
import com.capi.music.tv.screens.TvPlaylistsScreen
import com.capi.music.tv.screens.TvPlayerScreen
import com.capi.music.tv.screens.TvSearchScreen
import com.capi.music.tv.screens.TvSettingsScreen

@Composable
fun TvScreen(
    route: TvRoute,
    backStack: TvBackStack,
) {
    when (route) {
        is TvRoute.Home -> TvHomeScreen(
            onOpenSearch = { backStack.navigate(TvRoute.Search) },
            onOpenAlbum = { backStack.navigate(TvRoute.Album(it)) },
            onOpenArtist = { backStack.navigate(TvRoute.Artist(it)) },
            onOpenPlaylist = { backStack.navigate(TvRoute.Playlist(it)) },
        )

        is TvRoute.Search -> TvSearchScreen(
            onOpenAlbum = { backStack.navigate(TvRoute.Album(it)) },
            onOpenArtist = { backStack.navigate(TvRoute.Artist(it)) },
            onOpenPlaylist = { backStack.navigate(TvRoute.Playlist(it)) },
        )

        is TvRoute.Library -> TvLibraryScreen(
            onOpenAlbum = { backStack.navigate(TvRoute.Album(it)) },
            onOpenArtist = { backStack.navigate(TvRoute.Artist(it)) },
            onOpenPlaylist = { backStack.navigate(TvRoute.Playlist(it)) },
        )

        is TvRoute.Playlists -> TvPlaylistsScreen(
            onOpenPlaylist = { backStack.navigate(TvRoute.Playlist(it)) },
            onBack = { backStack.back() },
        )

        is TvRoute.Artists -> TvArtistsScreen(
            onOpenArtist = { backStack.navigate(TvRoute.Artist(it)) },
            onBack = { backStack.back() },
        )

        is TvRoute.Albums -> TvAlbumsScreen(
            onOpenAlbum = { backStack.navigate(TvRoute.Album(it)) },
            onBack = { backStack.back() },
        )

        is TvRoute.Settings -> TvSettingsScreen(onBack = { backStack.back() })

        is TvRoute.Album -> TvAlbumScreen(
            albumId = route.id,
            onBack = { backStack.back() },
            onOpenArtist = { backStack.navigate(TvRoute.Artist(it)) },
        )

        is TvRoute.Artist -> TvArtistScreen(
            artistId = route.id,
            onBack = { backStack.back() },
            onOpenAlbum = { backStack.navigate(TvRoute.Album(it)) },
            onOpenPlaylist = { backStack.navigate(TvRoute.Playlist(it)) },
        )

        is TvRoute.Playlist -> TvPlaylistScreen(
            playlistId = route.id,
            onBack = { backStack.back() },
        )

        is TvRoute.Player -> TvPlayerScreen(onBack = { backStack.back() })
    }
}

@Composable
fun TvApp(backStack: TvBackStack) {
    val route = backStack.current
    val playerConnection = LocalPlayerConnection.current
    val activity = LocalContext.current as? ComponentActivity

    BackHandler(enabled = true) {
        if (backStack.isRoot) {
            activity?.finish()
        } else {
            backStack.back()
        }
    }

    Box(
        modifier =
            Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color.Black,
                            Color(0xFF0E0D12),
                        ),
                    ),
                ),
    ) {
        Row(Modifier.fillMaxSize()) {
            if (route !is TvRoute.Player) {
                TvSidebar(
                    current = route,
                    onSelect = {
                        if (it is TvRoute.Player) {
                            backStack.navigate(it)
                        } else if (backStack.isRoot) {
                            backStack.navigate(it)
                        } else {
                            backStack.navigate(it)
                        }
                    },
                )
            }
            AnimatedContent(
                targetState = route,
                transitionSpec = {
                    (fadeIn(tween(240)) + scaleIn(initialScale = 0.985f, animationSpec = tween(240)))
                        .togetherWith(fadeOut(tween(160)) + scaleOut(targetScale = 0.99f, animationSpec = tween(160)))
                },
                label = "tv-screen",
                modifier =
                    Modifier
                        .weight(1f)
                        .fillMaxSize()
                        .padding(bottom = if (route is TvRoute.Player) 0.dp else 150.dp),
            ) { target ->
                TvScreen(target, backStack)
            }
        }
        if (route !is TvRoute.Player) {
            TvMiniPlayer(
                playerConnection = playerConnection,
                onExpand = { backStack.navigate(TvRoute.Player) },
                onOpenQueue = { backStack.navigate(TvRoute.Player) },
                modifier = Modifier.align(Alignment.BottomCenter),
            )
        }
    }
}