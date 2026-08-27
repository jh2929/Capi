package com.capi.music.tv

import androidx.compose.runtime.Composable
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.toMutableStateList
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.listSaver
import androidx.compose.runtime.saveable.rememberSaveable
import java.net.URLDecoder
import java.net.URLEncoder

sealed interface TvRoute {
    val key: String

    data object Home : TvRoute {
        override val key: String = "home"
    }

    data object Search : TvRoute {
        override val key: String = "search"
    }

    data object Library : TvRoute {
        override val key: String = "library"
    }

    data object Playlists : TvRoute {
        override val key: String = "playlists"
    }

    data object Artists : TvRoute {
        override val key: String = "artists"
    }

    data object Albums : TvRoute {
        override val key: String = "albums"
    }

    data object Settings : TvRoute {
        override val key: String = "settings"
    }

    data object Player : TvRoute {
        override val key: String = "player"
    }

    data class Album(val id: String) : TvRoute {
        override val key: String = "album::${id.encode()}"
    }

    data class Artist(val id: String) : TvRoute {
        override val key: String = "artist::${id.encode()}"
    }

    data class Playlist(val id: String) : TvRoute {
        override val key: String = "playlist::${id.encode()}"
    }
}

private fun String.encode(): String = URLEncoder.encode(this, "UTF-8")

private fun String.decode(): String = URLDecoder.decode(this, "UTF-8")

private fun tvRouteFromKey(key: String): TvRoute =
    when {
        key == "home" -> TvRoute.Home
        key == "search" -> TvRoute.Search
        key == "library" -> TvRoute.Library
        key == "playlists" -> TvRoute.Playlists
        key == "artists" -> TvRoute.Artists
        key == "albums" -> TvRoute.Albums
        key == "settings" -> TvRoute.Settings
        key == "player" -> TvRoute.Player
        key.startsWith("album::") -> TvRoute.Album(key.removePrefix("album::").decode())
        key.startsWith("artist::") -> TvRoute.Artist(key.removePrefix("artist::").decode())
        key.startsWith("playlist::") -> TvRoute.Playlist(key.removePrefix("playlist::").decode())
        else -> TvRoute.Home
    }

class TvBackStack(private val stack: SnapshotStateList<String>) {
    val current: TvRoute get() = tvRouteFromKey(stack.last())
    val isRoot: Boolean get() = stack.size == 1

    fun navigate(route: TvRoute) {
        if (current.key != route.key) stack.add(route.key)
    }

    fun back() {
        if (stack.size > 1) stack.removeAt(stack.lastIndex)
    }
}

@Composable
fun rememberTvBackStack(): TvBackStack {
    val keys =
        rememberSaveable(
            saver =
                listSaver(
                    save = { it.toList() },
                    restore = { it.toMutableStateList() },
                ),
        ) { mutableStateListOf(TvRoute.Home.key) }
    val backStack = remember(keys) { TvBackStack(keys) }
    return backStack
}