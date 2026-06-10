package com.arturo254.capi.core

import com.arturo254.opentune.innertube.YouTube
import com.arturo254.opentune.innertube.YouTube.SearchFilter
import com.arturo254.opentune.innertube.models.YouTubeClient
import com.arturo254.opentune.innertube.models.SongItem
import com.arturo254.opentune.innertube.NewPipeUtils
import com.arturo254.opentune.lrclib.LrcLib
import com.arturo254.opentune.innertube.pages.HomePage
import com.arturo254.opentune.innertube.pages.ArtistPage
import com.arturo254.opentune.innertube.pages.ExplorePage
import com.arturo254.opentune.innertube.pages.MoodAndGenres
import com.arturo254.opentune.innertube.utils.PoTokenGenerator
import kotlinx.coroutines.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlin.system.exitProcess

@Serializable
data class SongDTO(
    val id: String,
    val title: String,
    val artist: String,
    val album: String?,
    val duration: Int?,
    val thumbnail: String?,
    val explicit: Boolean,
    val artistId: String? = null
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

@Serializable
data class YTItemDTO(
    val type: String, // "song", "album", "playlist", "artist"
    val id: String,
    val title: String,
    val thumbnail: String?,
    val explicit: Boolean,
    val artists: List<String>? = null,
    val album: String? = null,
    val duration: Int? = null,
    val year: Int? = null,
    val playlistId: String? = null,
    val browseId: String? = null,
    val author: String? = null
)

@Serializable
data class HomeSectionDTO(
    val title: String,
    val label: String?,
    val thumbnail: String?,
    val params: String?,
    val items: List<YTItemDTO>
)

@Serializable
data class HomeResponseDTO(
    val sections: List<HomeSectionDTO>,
    val continuation: String?
)

@Serializable
data class ArtistPageDTO(
    val id: String,
    val name: String,
    val thumbnail: String?,
    val description: String?,
    val sections: List<ArtistSectionDTO>
)

@Serializable
data class ArtistSectionDTO(
    val title: String,
    val items: List<YTItemDTO>,
    val browseId: String? = null,
    val params: String? = null
)

@Serializable
data class ExploreResponseDTO(
    val newReleaseAlbums: List<YTItemDTO>,
    val moodAndGenres: List<MoodGenreDTO>
)

@Serializable
data class MoodGenreDTO(
    val title: String,
    val stripeColor: Long,
    val browseId: String,
    val params: String?
)

fun mapYTItem(item: com.arturo254.opentune.innertube.models.YTItem): YTItemDTO {
    return when (item) {
        is com.arturo254.opentune.innertube.models.SongItem -> YTItemDTO(
            type = "song",
            id = item.id,
            title = item.title,
            thumbnail = item.thumbnail,
            explicit = item.explicit,
            artists = item.artists.map { it.name },
            album = item.album?.name,
            duration = item.duration
        )
        is com.arturo254.opentune.innertube.models.AlbumItem -> YTItemDTO(
            type = "album",
            id = item.browseId,
            title = item.title,
            thumbnail = item.thumbnail,
            explicit = item.explicit,
            artists = item.artists?.map { it.name },
            year = item.year,
            playlistId = item.playlistId,
            browseId = item.browseId
        )
        is com.arturo254.opentune.innertube.models.PlaylistItem -> YTItemDTO(
            type = "playlist",
            id = item.id,
            title = item.title,
            thumbnail = item.thumbnail,
            explicit = item.explicit,
            author = item.author?.name
        )
        is com.arturo254.opentune.innertube.models.ArtistItem -> YTItemDTO(
            type = "artist",
            id = item.id,
            title = item.title,
            thumbnail = item.thumbnail,
            explicit = item.explicit,
            browseId = item.id
        )
    }
}

private var cachedSignatureTimestamp: Int? = null

fun main(args: Array<String>) {
    // Prevent GraalVM from stripping serializers during static analysis by actively referencing them
    val activeSerializers = listOf(
        com.arturo254.opentune.innertube.models.body.SearchBody.serializer(),
        com.arturo254.opentune.innertube.models.body.PlayerBody.serializer(),
        com.arturo254.opentune.innertube.models.body.BrowseBody.serializer(),
        com.arturo254.opentune.innertube.models.response.PlayerResponse.serializer(),
        com.arturo254.opentune.innertube.models.response.SearchResponse.serializer(),
        com.arturo254.opentune.innertube.models.response.BrowseResponse.serializer(),
        com.arturo254.opentune.innertube.models.response.BrowseResponse.Contents.serializer(),
        com.arturo254.opentune.innertube.models.response.BrowseResponse.TwoColumnBrowseResultsRenderer.serializer(),
        com.arturo254.opentune.innertube.models.response.BrowseResponse.SecondaryContents.serializer(),
        com.arturo254.opentune.innertube.models.response.BrowseResponse.ContinuationContents.serializer(),
        com.arturo254.opentune.innertube.models.response.BrowseResponse.ContinuationContents.SectionListContinuation.serializer(),
        com.arturo254.opentune.innertube.models.response.BrowseResponse.ContinuationContents.MusicPlaylistShelfContinuation.serializer(),
        com.arturo254.opentune.innertube.models.response.BrowseResponse.ContinuationContents.GridContinuation.serializer(),
        com.arturo254.opentune.innertube.models.response.BrowseResponse.ResponseAction.serializer(),
        com.arturo254.opentune.innertube.models.response.BrowseResponse.ResponseAction.ContinuationItems.serializer(),
        com.arturo254.opentune.innertube.models.response.BrowseResponse.Header.serializer(),
        com.arturo254.opentune.innertube.models.response.BrowseResponse.Header.MusicImmersiveHeaderRenderer.serializer(),
        com.arturo254.opentune.innertube.models.response.BrowseResponse.Header.MusicVisualHeaderRenderer.serializer(),
        com.arturo254.opentune.innertube.models.response.BrowseResponse.Header.Buttons.serializer(),
        com.arturo254.opentune.innertube.models.response.BrowseResponse.Header.MusicHeaderRenderer.serializer(),
        com.arturo254.opentune.innertube.models.response.BrowseResponse.Header.MusicThumbnail.serializer(),
        com.arturo254.opentune.innertube.models.response.BrowseResponse.Header.MusicThumbnailRenderer.serializer(),
        com.arturo254.opentune.innertube.models.response.BrowseResponse.Microformat.serializer(),
        com.arturo254.opentune.innertube.models.response.BrowseResponse.Microformat.MicroformatDataRenderer.serializer(),
        com.arturo254.opentune.innertube.models.Continuation.serializer(),
        com.arturo254.opentune.innertube.models.Context.serializer(),
        com.arturo254.opentune.innertube.models.Context.Client.serializer(),
        com.arturo254.opentune.innertube.models.Context.ThirdParty.serializer(),
        com.arturo254.opentune.innertube.models.Context.Request.serializer(),
        com.arturo254.opentune.innertube.models.Context.User.serializer(),
        com.arturo254.opentune.innertube.models.Tabs.serializer(),
        com.arturo254.opentune.innertube.models.Tabs.Tab.serializer(),
        com.arturo254.opentune.innertube.models.SectionListRenderer.serializer(),
        com.arturo254.opentune.innertube.models.SectionListRenderer.Content.serializer(),
        com.arturo254.opentune.innertube.models.MusicShelfRenderer.serializer(),
        com.arturo254.opentune.innertube.models.MusicShelfRenderer.Content.serializer(),
        com.arturo254.opentune.innertube.models.GridRenderer.serializer(),
        com.arturo254.opentune.innertube.models.GridRenderer.Item.serializer(),
        com.arturo254.opentune.innertube.models.Runs.serializer(),
        com.arturo254.opentune.innertube.models.Run.serializer(),
        com.arturo254.opentune.innertube.models.Menu.serializer(),
        com.arturo254.opentune.innertube.models.Menu.MenuRenderer.serializer(),
        com.arturo254.opentune.innertube.models.Button.serializer(),
        com.arturo254.opentune.innertube.models.SubscriptionButton.serializer(),
        com.arturo254.opentune.innertube.models.ThumbnailRenderer.serializer(),
        com.arturo254.opentune.innertube.models.Thumbnail.serializer(),
        com.arturo254.opentune.lrclib.models.Track.serializer(),
        YTItemDTO.serializer(),
        HomeSectionDTO.serializer(),
        HomeResponseDTO.serializer(),
        ArtistPageDTO.serializer(),
        ArtistSectionDTO.serializer(),
        ExploreResponseDTO.serializer(),
        MoodGenreDTO.serializer()
    )
    if (System.getenv("OPENTUNE_DEBUG") != null) {
        activeSerializers.forEach { println(it.descriptor.serialName) }
    }

    if (args.isEmpty()) {
        printError("No arguments provided. Use --search, --get-stream, --lyrics, --home, --artist, or --explore")
        exitProcess(1)
    }

    val action = args[0]
    runBlocking {
        YouTube.webClientPoTokenEnabled = true
        System.err.println("[DEBUG] [${System.currentTimeMillis()}] Starting main coroutine blocking...")
        try {
            if (action == "--generate-only") {
                val visitorData = withTimeoutOrNull(20000) {
                    YouTube.visitorData().getOrNull()
                }
                if (visitorData != null) {
                    try {
                        val token = PoTokenGenerator.generateColdStartToken(visitorData)
                        println(Json.encodeToString(mapOf("poToken" to token, "visitorData" to visitorData)))
                        System.out.flush()
                        exitProcess(0)
                    } catch (e: Exception) {
                        System.err.println("Error generating PO token: ${e.message}")
                        exitProcess(1)
                    }
                } else {
                    System.err.println("visitorData is null")
                    exitProcess(1)
                }
            }

            if (action == "--daemon") {
                val extPoToken = System.getenv("OPENTUNE_PO_TOKEN")
                val extVisitorData = System.getenv("OPENTUNE_VISITOR_DATA")
                if (!extPoToken.isNullOrBlank() && !extVisitorData.isNullOrBlank()) {
                    YouTube.visitorData = extVisitorData
                    YouTube.poToken = extPoToken
                    YouTube.poTokenGvs = extPoToken
                    YouTube.poTokenPlayer = extPoToken
                    System.err.println("[DAEMON] Using EXTERNAL genuine PO Token")
                } else {
                    // Initialize visitorData and PO Tokens once
                    val visitorData = withTimeoutOrNull(20000) {
                        YouTube.visitorData().getOrNull()
                    }
                    YouTube.visitorData = visitorData
                    if (visitorData != null) {
                        try {
                            YouTube.poToken = PoTokenGenerator.generateColdStartToken(visitorData)
                            YouTube.poTokenGvs = PoTokenGenerator.generateSessionToken(visitorData)
                            YouTube.poTokenPlayer = PoTokenGenerator.generateColdStartToken(visitorData, "player")
                            System.err.println("[DAEMON] PO Tokens generated successfully")
                        } catch (e: Exception) {
                            System.err.println("[DAEMON] WARNING: Failed to generate PO Tokens: ${e.message}")
                        }
                    } else {
                        System.err.println("[DAEMON] WARNING: visitorData is null, PO Tokens not generated")
                    }
                }

                // Pre-fetch signature timestamp in background to eliminate latency on first play
                launch(Dispatchers.IO) {
                    try {
                        val sig = NewPipeUtils.getSignatureTimestamp("lYBUbBu4W08").getOrNull()
                        if (sig != null) {
                            cachedSignatureTimestamp = sig
                            System.err.println("[DAEMON] Signature timestamp pre-fetched: $sig")
                        }
                    } catch (e: Exception) {
                        System.err.println("[DAEMON] WARNING: Failed to pre-fetch signature timestamp: ${e.message}")
                    }
                }

                // Signal ready
                println(Json.encodeToString(mapOf("status" to "ready")))
                System.out.flush()

                val reader = java.io.BufferedReader(java.io.InputStreamReader(System.`in`))
                while (true) {
                    val line = reader.readLine() ?: break
                    if (line.isBlank()) continue
                    val response = try {
                        val cmdObj = Json.parseToJsonElement(line) as? JsonObject
                        val act = cmdObj?.get("action")?.jsonPrimitive?.contentOrNull
                        when (act) {
                            "search" -> {
                                val query = cmdObj["query"]?.jsonPrimitive?.contentOrNull ?: throw Exception("Missing query")
                                val result = YouTube.search(query, SearchFilter.FILTER_SONG).getOrThrow()
                                val songs = result.items.filterIsInstance<SongItem>().map {
                                    SongDTO(
                                        id = it.id,
                                        title = it.title,
                                        artist = it.artists.joinToString(", ") { a -> a.name },
                                        album = it.album?.name,
                                        duration = it.duration,
                                        thumbnail = it.thumbnail,
                                        explicit = it.explicit,
                                        artistId = it.artists.firstOrNull()?.id
                                    )
                                }
                                Json.encodeToString(songs)
                            }
                            "get-stream" -> {
                                val videoId = cmdObj["id"]?.jsonPrimitive?.contentOrNull ?: throw Exception("Missing id")
                                val reqPoToken = cmdObj["poToken"]?.jsonPrimitive?.contentOrNull
                                val reqVisitorData = cmdObj["visitorData"]?.jsonPrimitive?.contentOrNull
                                if (!reqPoToken.isNullOrBlank() && !reqVisitorData.isNullOrBlank()) {
                                    YouTube.visitorData = reqVisitorData
                                    YouTube.poToken = reqPoToken
                                    YouTube.poTokenGvs = reqPoToken
                                    YouTube.poTokenPlayer = reqPoToken
                                }
                                      val clients = listOf(
                                          YouTubeClient.ANDROID_MUSIC,
                                          YouTubeClient.ANDROID_VR_NO_AUTH
                                      )
                                    val sig = if (clients.any { it.useSignatureTimestamp }) {
                                        cachedSignatureTimestamp ?: NewPipeUtils.getSignatureTimestamp(videoId).getOrNull()?.also {
                                            cachedSignatureTimestamp = it
                                        }
                                    } else null
                                    val streamUrl = kotlinx.coroutines.supervisorScope {
                                     val deferreds = clients.map { client ->
                                        async(Dispatchers.IO) {
                                            try {
                                                val playerResp = YouTube.player(
                                                    videoId = videoId,
                                                    client = client,
                                                    signatureTimestamp = sig
                                                ).getOrThrow()

                                                val audioFormats = playerResp.streamingData?.adaptiveFormats?.filter { it.isAudio && it.mimeType?.contains("codecs=\"opus\"") != true } ?: emptyList()
                                                if (audioFormats.isNotEmpty()) {
                                                    val format = audioFormats.maxByOrNull { it.bitrate }!!
                                                    val urlResult = NewPipeUtils.getStreamUrl(format, videoId, client)
                                                    val url = urlResult.getOrNull()
                                                    if (url != null) {
                                                        return@async url
                                                    } else {
                                                        val err = urlResult.exceptionOrNull()
                                                        System.err.println("[DEBUG] Client ${client.clientName}: NewPipeUtils.getStreamUrl failed: ${err?.message} | Cause: ${err?.cause?.message}")
                                                    }
                                                } else {
                                                    System.err.println("[DEBUG] Client ${client.clientName} playability: ${playerResp.playabilityStatus.status}, reason: ${playerResp.playabilityStatus.reason}")
                                                }
                                            } catch (e: Exception) {
                                                val msg = e.message?.take(200) ?: "Unknown error"
                                                System.err.println("[DEBUG] Client ${client.clientName} failed: $msg")
                                            }
                                            null
                                        }
                                    }

                                    val channel = kotlinx.coroutines.channels.Channel<String>(1)
                                    var activeJobs = deferreds.size
                                    deferreds.forEach { deferred ->
                                        launch {
                                            try {
                                                val res = deferred.await()
                                                if (res != null) {
                                                    channel.trySend(res)
                                                }
                                            } finally {
                                                activeJobs--
                                                if (activeJobs == 0) {
                                                    channel.close()
                                                }
                                            }
                                        }
                                    }

                                    val firstResult = channel.receiveCatching().getOrNull()
                                    deferreds.forEach { it.cancel() }
                                    firstResult
                                }
                                if (streamUrl != null) {
                                    Json.encodeToString(StreamDTO(streamUrl))
                                } else {
                                    throw Exception("No stream found for videoId $videoId")
                                }
                            }
                            "lyrics" -> {
                                val artist = cmdObj["artist"]?.jsonPrimitive?.contentOrNull.orEmpty()
                                val title = cmdObj["title"]?.jsonPrimitive?.contentOrNull.orEmpty()
                                val duration = cmdObj["duration"]?.jsonPrimitive?.contentOrNull?.toIntOrNull() ?: -1
                                val lyrics = LrcLib.getLyrics(title, artist, duration).getOrNull()
                                Json.encodeToString(LyricsDTO(lyrics))
                            }
                            "home" -> {
                                val continuation = cmdObj["continuation"]?.jsonPrimitive?.contentOrNull
                                val homePage = YouTube.home(continuation = continuation).getOrThrow()
                                val sections = homePage.sections.map { section ->
                                    HomeSectionDTO(
                                        title = section.title,
                                        label = section.label,
                                        thumbnail = section.thumbnail,
                                        params = section.endpoint?.params,
                                        items = section.items.map { mapYTItem(it) }
                                    )
                                }
                                val response = HomeResponseDTO(sections, homePage.continuation)
                                Json.encodeToString(response)
                            }
                            "artist" -> {
                                val artistId = cmdObj["id"]?.jsonPrimitive?.contentOrNull ?: throw Exception("Missing id")
                                val artistPage = YouTube.artist(artistId).getOrThrow()
                                val dto = ArtistPageDTO(
                                    id = artistPage.artist.id,
                                    name = artistPage.artist.title,
                                    thumbnail = artistPage.artist.thumbnail,
                                    description = artistPage.description,
                                    sections = artistPage.sections.map { section ->
                                        ArtistSectionDTO(
                                            title = section.title,
                                            items = section.items.map { mapYTItem(it) },
                                            browseId = section.moreEndpoint?.browseId,
                                            params = section.moreEndpoint?.params
                                        )
                                    }
                                )
                                Json.encodeToString(dto)
                            }
                            "explore" -> {
                                val explorePage = YouTube.explore().getOrThrow()
                                val dto = ExploreResponseDTO(
                                    newReleaseAlbums = explorePage.newReleaseAlbums.map { mapYTItem(it) },
                                    moodAndGenres = explorePage.moodAndGenres.map { item ->
                                        MoodGenreDTO(
                                            title = item.title,
                                            stripeColor = item.stripeColor,
                                            browseId = item.endpoint.browseId,
                                            params = item.endpoint.params
                                        )
                                    }
                                )
                                Json.encodeToString(dto)
                            }
                            "refresh-tokens" -> {
                                val newVisitorData = withTimeoutOrNull(5000) {
                                    YouTube.visitorData().getOrNull()
                                }
                                YouTube.visitorData = newVisitorData
                                if (newVisitorData != null) {
                                    YouTube.poToken = PoTokenGenerator.generateColdStartToken(newVisitorData)
                                    YouTube.poTokenGvs = PoTokenGenerator.generateSessionToken(newVisitorData)
                                    YouTube.poTokenPlayer = PoTokenGenerator.generateColdStartToken(newVisitorData, "player")
                                    Json.encodeToString(mapOf("success" to true))
                                } else {
                                    throw Exception("Failed to refresh visitorData")
                                }
                            }
                            "set-tokens" -> {
                                val newPoToken = cmdObj["poToken"]?.jsonPrimitive?.contentOrNull
                                val newVisitorData = cmdObj["visitorData"]?.jsonPrimitive?.contentOrNull
                                if (newPoToken != null && newVisitorData != null) {
                                    YouTube.visitorData = newVisitorData
                                    YouTube.poToken = newPoToken
                                    YouTube.poTokenGvs = newPoToken
                                    YouTube.poTokenPlayer = newPoToken
                                    System.err.println("[DAEMON] Dynamic PO Token set successfully")
                                    Json.encodeToString(mapOf("success" to true))
                                } else {
                                    throw Exception("Missing poToken or visitorData")
                                }
                            }
                            "get-playlist" -> {
                                var playlistId = cmdObj["id"]?.jsonPrimitive?.contentOrNull ?: throw Exception("Missing id")
                                if (playlistId.startsWith("VL")) {
                                    playlistId = playlistId.substring(2)
                                }
                                val songs = if (playlistId.startsWith("OLAK")) {
                                    val resolvedSongs = YouTube.albumSongs(playlistId).getOrThrow()
                                    resolvedSongs.map {
                                        SongDTO(
                                            id = it.id,
                                            title = it.title,
                                            artist = it.artists.joinToString(", ") { a -> a.name },
                                            album = it.album?.name,
                                            duration = it.duration,
                                            thumbnail = it.thumbnail,
                                            explicit = it.explicit,
                                            artistId = it.artists.firstOrNull()?.id
                                        )
                                    }
                                } else if (playlistId.startsWith("MPREb")) {
                                    val albumPage = YouTube.album(playlistId).getOrThrow()
                                    albumPage.songs.map {
                                        SongDTO(
                                            id = it.id,
                                            title = it.title,
                                            artist = it.artists.joinToString(", ") { a -> a.name },
                                            album = it.album?.name,
                                            duration = it.duration,
                                            thumbnail = it.thumbnail,
                                            explicit = it.explicit,
                                            artistId = it.artists.firstOrNull()?.id
                                        )
                                    }
                                } else {
                                    val playlistPage = YouTube.playlist(playlistId).getOrThrow()
                                    playlistPage.songs.map {
                                        SongDTO(
                                            id = it.id,
                                            title = it.title,
                                            artist = it.artists.joinToString(", ") { a -> a.name },
                                            album = it.album?.name,
                                            duration = it.duration,
                                            thumbnail = it.thumbnail,
                                            explicit = it.explicit,
                                            artistId = it.artists.firstOrNull()?.id
                                        )
                                    }
                                }
                                Json.encodeToString(songs)
                            }
                            else -> throw Exception("Unknown action: $act")
                        }
                    } catch (e: Exception) {
                        val msg = e.message?.take(200) ?: "Unknown error"
                        Json.encodeToString(ErrorDTO(msg))
                    }
                    println(response)
                    System.out.flush()
                }
            } else {
                YouTube.visitorData = YouTube.visitorData().getOrNull()
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
                                explicit = it.explicit,
                                artistId = it.artists.firstOrNull()?.id
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
                        
                         val extPoToken = System.getenv("OPENTUNE_PO_TOKEN")
                         val extVisitorData = System.getenv("OPENTUNE_VISITOR_DATA")
                         if (!extPoToken.isNullOrBlank() && !extVisitorData.isNullOrBlank()) {
                             YouTube.visitorData = extVisitorData
                             YouTube.poToken = extPoToken
                             YouTube.poTokenGvs = extPoToken
                             YouTube.poTokenPlayer = extPoToken
                             System.err.println("[CLI] Using EXTERNAL genuine PO Token")
                         } else {
                             val visitorData = YouTube.visitorData().getOrNull()
                             YouTube.visitorData = visitorData
                             if (visitorData != null) {
                                 try {
                                     YouTube.poToken = PoTokenGenerator.generateColdStartToken(visitorData)
                                     YouTube.poTokenGvs = PoTokenGenerator.generateSessionToken(visitorData)
                                     YouTube.poTokenPlayer = PoTokenGenerator.generateColdStartToken(visitorData, "player")
                                 } catch (e: Exception) {
                                     System.err.println("[CLI] Failed to generate PO Tokens: ${e.message}")
                                 }
                             }
                         }
                        
                             val clients = listOf(
                                 YouTubeClient.ANDROID_MUSIC,
                                 YouTubeClient.ANDROID_VR_NO_AUTH
                             )
                         
                         val sig = if (clients.any { it.useSignatureTimestamp }) {
                             cachedSignatureTimestamp ?: NewPipeUtils.getSignatureTimestamp(videoId).getOrNull()?.also {
                                 cachedSignatureTimestamp = it
                             }
                         } else null
                         
                         val streamUrl = coroutineScope {
                            val deferreds = clients.map { client ->
                                async(Dispatchers.IO) {
                                    try {
                                        val playerResp = YouTube.player(
                                            videoId = videoId,
                                            client = client,
                                            signatureTimestamp = sig
                                        ).getOrThrow()

                                         val audioFormats = playerResp.streamingData?.adaptiveFormats?.filter { it.isAudio && it.mimeType?.contains("codecs=\"opus\"") != true } ?: emptyList()
                                         if (audioFormats.isNotEmpty()) {
                                             val format = audioFormats.maxByOrNull { it.bitrate }!!
                                            val url = NewPipeUtils.getStreamUrl(format, videoId, client).getOrNull()
                                            if (url != null) {
                                                return@async url
                                            }
                                        }
                                    } catch (e: Exception) {
                                        val msg = e.message?.take(200) ?: "Unknown error"
                                        System.err.println("[DEBUG] Client ${client.clientName} failed: $msg")
                                    }
                                    null
                                }
                            }

                            val channel = kotlinx.coroutines.channels.Channel<String>(1)
                            var activeJobs = deferreds.size
                            deferreds.forEach { deferred ->
                                launch {
                                    try {
                                        val res = deferred.await()
                                        if (res != null) {
                                            channel.trySend(res)
                                        }
                                    } finally {
                                        activeJobs--
                                        if (activeJobs == 0) {
                                            channel.close()
                                        }
                                    }
                                }
                            }

                            val firstResult = channel.receiveCatching().getOrNull()
                            deferreds.forEach { it.cancel() }
                            firstResult
                        }
                        
                        if (streamUrl != null) {
                            println(Json.encodeToString(StreamDTO(streamUrl)))
                            exitProcess(0)
                        } else {
                            throw Exception("No stream found for videoId $videoId")
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
                    "--home" -> {
                        val continuation = if (args.size > 1) args[1] else null
                        val homePage = YouTube.home(continuation = continuation).getOrThrow()
                        val sections = homePage.sections.map { section ->
                            HomeSectionDTO(
                                title = section.title,
                                label = section.label,
                                thumbnail = section.thumbnail,
                                params = section.endpoint?.params,
                                items = section.items.map { mapYTItem(it) }
                            )
                        }
                        val response = HomeResponseDTO(sections, homePage.continuation)
                        println(Json.encodeToString(response))
                        exitProcess(0)
                    }
                    "--artist" -> {
                        if (args.size < 2) {
                            printError("Missing artist ID")
                            exitProcess(1)
                        }
                        val artistId = args[1]
                        val artistPage = YouTube.artist(artistId).getOrThrow()
                        val dto = ArtistPageDTO(
                            id = artistPage.artist.id,
                            name = artistPage.artist.title,
                            thumbnail = artistPage.artist.thumbnail,
                            description = artistPage.description,
                            sections = artistPage.sections.map { section ->
                                ArtistSectionDTO(
                                    title = section.title,
                                    items = section.items.map { mapYTItem(it) },
                                    browseId = section.moreEndpoint?.browseId,
                                    params = section.moreEndpoint?.params
                                )
                            }
                        )
                        println(Json.encodeToString(dto))
                        exitProcess(0)
                    }
                    "--explore" -> {
                        val explorePage = YouTube.explore().getOrThrow()
                        val dto = ExploreResponseDTO(
                            newReleaseAlbums = explorePage.newReleaseAlbums.map { mapYTItem(it) },
                            moodAndGenres = explorePage.moodAndGenres.map { item ->
                                MoodGenreDTO(
                                    title = item.title,
                                    stripeColor = item.stripeColor,
                                    browseId = item.endpoint.browseId,
                                    params = item.endpoint.params
                                )
                            }
                        )
                        println(Json.encodeToString(dto))
                        exitProcess(0)
                    }
                    else -> {
                        printError("Unknown argument: $action")
                        exitProcess(1)
                    }
                }
            }
        } catch (e: Exception) {
            val msg = e.message?.take(200) ?: "Unknown error occurred"
            printError(msg)
            exitProcess(1)
        }
    }
}

fun printError(message: String) {
    println(Json.encodeToString(ErrorDTO(message)))
}

