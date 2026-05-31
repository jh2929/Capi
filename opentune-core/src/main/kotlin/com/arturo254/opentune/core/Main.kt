package com.arturo254.opentune.core

import com.arturo254.opentune.innertube.YouTube
import com.arturo254.opentune.innertube.YouTube.SearchFilter
import com.arturo254.opentune.innertube.models.YouTubeClient
import com.arturo254.opentune.innertube.models.SongItem
import com.arturo254.opentune.innertube.NewPipeUtils
import com.arturo254.opentune.lrclib.LrcLib
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlin.system.exitProcess

@Serializable
data class SongDTO(
    val id: String,
    val title: String,
    val artist: String,
    val album: String?,
    val duration: Int?,
    val thumbnail: String?,
    val explicit: Boolean
)

@Serializable
data class StreamDTO(
    val url: String
)

@Serializable
data class LyricsDTO(
    val lyrics: String?
)

@Serializable
data class ErrorDTO(
    val error: String
)

fun main(args: Array<String>) {
    // Prevent GraalVM from stripping serializers during static analysis by actively referencing them
    val activeSerializers = listOf(
        com.arturo254.opentune.innertube.models.body.SearchBody.serializer(),
        com.arturo254.opentune.innertube.models.body.PlayerBody.serializer(),
        com.arturo254.opentune.innertube.models.response.PlayerResponse.serializer(),
        com.arturo254.opentune.innertube.models.response.SearchResponse.serializer(),
        com.arturo254.opentune.lrclib.models.Track.serializer()
    )
    if (System.getenv("OPENTUNE_DEBUG") != null) {
        activeSerializers.forEach { println(it.descriptor.serialName) }
    }

    if (args.isEmpty()) {
        printError("No arguments provided. Use --search, --get-stream or --lyrics")
        exitProcess(1)
    }

    val action = args[0]
    runBlocking {
        System.err.println("[DEBUG] [${System.currentTimeMillis()}] Starting main coroutine blocking...")
        try {
            // YouTube.visitorData = YouTube.visitorData().getOrNull()
            when (action) {
                "--search" -> {
                    if (args.size < 2) {
                        printError("Missing search query")
                        exitProcess(1)
                    }
                    val query = args[1]
                    System.err.println("[DEBUG] [${System.currentTimeMillis()}] Starting YouTube.search with query: $query")
                    val result = YouTube.search(query, SearchFilter.FILTER_SONG).getOrThrow()
                    System.err.println("[DEBUG] [${System.currentTimeMillis()}] Finished YouTube.search successfully")
                    val songs = result.items.filterIsInstance<SongItem>().map {
                        SongDTO(
                            id = it.id,
                            title = it.title,
                            artist = it.artists.joinToString(", ") { a -> a.name },
                            album = it.album?.name,
                            duration = it.duration,
                            thumbnail = it.thumbnail,
                            explicit = it.explicit
                        )
                    }
                    println(Json.encodeToString(songs))
                    exitProcess(0)
                }
                "--get-stream" -> {
                    if (args.size < 2) {
                        printError("Missing video ID")
                        exitProcess(1)
                    }
                    val videoId = args[1]
                    val sig = NewPipeUtils.getSignatureTimestamp(videoId).getOrNull()
                    
                    val clients = listOf(
                        YouTubeClient.ANDROID_VR_NO_AUTH,
                        YouTubeClient.IOS,
                        YouTubeClient.TVHTML5,
                        YouTubeClient.WEB_REMIX
                    )
                    
                    var lastException: Throwable? = null
                    var streamUrl: String? = null
                    
                    for (client in clients) {
                        try {
                            val playerResp = YouTube.player(
                                videoId = videoId,
                                client = client,
                                signatureTimestamp = sig
                            ).getOrThrow()
                            
                            val audioFormats = playerResp.streamingData?.adaptiveFormats?.filter { it.isAudio } ?: emptyList()
                            if (audioFormats.isNotEmpty()) {
                                val format = audioFormats.maxByOrNull { it.bitrate }!!
                                val url = NewPipeUtils.getStreamUrl(format, videoId, client).getOrNull()
                                if (url != null) {
                                    streamUrl = url
                                    break
                                }
                            }
                        } catch (e: Exception) {
                            lastException = e
                        }
                    }
                    
                    if (streamUrl != null) {
                        println(Json.encodeToString(StreamDTO(streamUrl)))
                        exitProcess(0)
                    } else {
                        throw lastException ?: Exception("No stream found for videoId $videoId")
                    }
                }
                "--lyrics" -> {
                    if (args.size < 4) {
                        printError("Usage: --lyrics [artist] [title] [duration_seconds]")
                        exitProcess(1)
                    }
                    val artist = args[1]
                    val title = args[2]
                    val duration = args[3].toIntOrNull() ?: -1
                    val lyrics = LrcLib.getLyrics(title, artist, duration).getOrNull()
                    println(Json.encodeToString(LyricsDTO(lyrics)))
                    exitProcess(0)
                }
                else -> {
                    printError("Unknown argument: $action")
                    exitProcess(1)
                }
            }
        } catch (e: Exception) {
            printError(e.message ?: "Unknown error occurred")
            exitProcess(1)
        }
    }
}

fun printError(message: String) {
    println(Json.encodeToString(ErrorDTO(message)))
}
