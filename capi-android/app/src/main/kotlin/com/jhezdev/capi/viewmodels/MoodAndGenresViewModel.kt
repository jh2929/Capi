/*
 * Capi Project Original (2026)
 * Jhezdev (github.com/Jhezdev)
 * Licensed Under GPL-3.0 | see git history for contributors
 */



package com.jhezdev.capi.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jhezdev.capi.innertube.YouTube
import com.jhezdev.capi.innertube.pages.MoodAndGenres
import com.jhezdev.capi.utils.reportException
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MoodAndGenresViewModel
@Inject
constructor() : ViewModel() {
    val moodAndGenres = MutableStateFlow<List<MoodAndGenres.Item>?>(null)

    init {
        viewModelScope.launch {
            YouTube
                .explore()
                .onSuccess {
                    moodAndGenres.value = it.moodAndGenres
                }.onFailure {
                    reportException(it)
                }
        }
    }
}
