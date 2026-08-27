/*
 * OpenTune Project Original (2026)
 * Arturo254 (github.com/Arturo254)
 * Licensed Under GPL-3.0 | see git history for contributors
 */



package com.capi.music.viewmodels
import kotlinx.coroutines.flow.combine

import android.content.Context
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.exoplayer.offline.Download
import com.capi.music.constants.AutoPlaylistSongSortDescendingKey
import com.capi.music.constants.AutoPlaylistSongSortType
import com.capi.music.constants.AutoPlaylistSongSortTypeKey
import com.capi.music.constants.HideExplicitKey
import com.capi.music.constants.HideVideoKey
import com.capi.music.constants.SongSortType
import com.capi.music.db.MusicDatabase
import com.capi.music.extensions.filterExplicit
import com.capi.music.extensions.reversed
import com.capi.music.extensions.toEnum
import com.capi.music.playback.DownloadUtil
import com.capi.music.utils.SyncUtils
import com.capi.music.utils.dataStore
import com.capi.music.utils.get
import com.capi.music.utils.reportException
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class AutoPlaylistViewModel
@Inject
constructor(
    @ApplicationContext context: Context,
    database: MusicDatabase,
    downloadUtil: DownloadUtil,
    savedStateHandle: SavedStateHandle,
    private val syncUtils: SyncUtils,
) : ViewModel() {
    val playlist = savedStateHandle.get<String>("playlist")!!

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing = _isRefreshing.asStateFlow()

    private fun AutoPlaylistSongSortType.toSongSortType(): SongSortType =
        when (this) {
            AutoPlaylistSongSortType.CREATE_DATE -> SongSortType.CREATE_DATE
            AutoPlaylistSongSortType.NAME -> SongSortType.NAME
            AutoPlaylistSongSortType.ARTIST -> SongSortType.ARTIST
            AutoPlaylistSongSortType.PLAY_TIME -> SongSortType.PLAY_TIME
        }

    @OptIn(ExperimentalCoroutinesApi::class)
    val likedSongs =
        context.dataStore.data
            .map {
                Triple(
                    it[AutoPlaylistSongSortTypeKey].toEnum(AutoPlaylistSongSortType.CREATE_DATE) to (it[AutoPlaylistSongSortDescendingKey]
                        ?: true),
                    it[HideExplicitKey] ?: false,
                    it[HideVideoKey] ?: false,
                )
            }
            .distinctUntilChanged()
            .flatMapLatest { (sortDesc, hideExplicit, hideVideo) ->
                val (sortType, descending) = sortDesc
                val songSortType = sortType.toSongSortType()
                when (playlist) {
                    "liked" -> database.likedSongs(songSortType, descending, hideVideo).map { it.filterExplicit(hideExplicit) }
                    "downloaded" -> combine(
                        database.allSongs().flowOn(Dispatchers.IO),
                        downloadUtil.downloads
                    ) { songs, downloads ->
                        songs.filter {
                            downloads[it.id]?.state == Download.STATE_COMPLETED
                        }.let { filteredSongs ->
                            when (songSortType) {
                                SongSortType.CREATE_DATE -> filteredSongs.sortedBy {
                                    downloads[it.id]?.updateTimeMs ?: 0L
                                }
                                SongSortType.NAME -> filteredSongs.sortedBy { it.song.title }
                                SongSortType.ARTIST -> filteredSongs.sortedBy { song ->
                                    song.artists.joinToString(separator = "") { it.name }
                                }
                                SongSortType.PLAY_TIME -> filteredSongs.sortedBy { it.song.totalPlayTime }
                            }.reversed(descending).filterExplicit(hideExplicit)
                        }
                    }
                    else -> MutableStateFlow(emptyList())
                }
            }.stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    fun refresh() {
        if (_isRefreshing.value) return
        viewModelScope.launch(Dispatchers.IO) {
            _isRefreshing.value = true
            try {
                when (playlist) {
                    "liked" -> syncUtils.syncLikedSongs()
                    else -> Unit
                }
            } catch (e: Exception) {
                reportException(e)
            } finally {
                _isRefreshing.value = false
            }
        }
    }

    fun syncLikedSongs() {
        refresh()
    }
}
