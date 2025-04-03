package com.arturo254.opentune.ui.screens.settings

import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.RequiresApi
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.platform.UriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.core.content.FileProvider
import androidx.navigation.NavController
import com.arturo254.innertube.utils.parseCookieString
import com.arturo254.opentune.BuildConfig
import com.arturo254.opentune.LocalPlayerAwareWindowInsets
import com.arturo254.opentune.R
import com.arturo254.opentune.constants.AccountNameKey
import com.arturo254.opentune.constants.InnerTubeCookieKey
import com.arturo254.opentune.ui.component.IconButton
import com.arturo254.opentune.ui.component.PreferenceEntry
import com.arturo254.opentune.ui.utils.backToMain
import com.arturo254.opentune.utils.rememberPreference
import kotlinx.coroutines.*
import org.json.JSONObject
import java.io.File
import java.net.URL

@SuppressLint("ObsoleteSdkInt")
@RequiresApi(Build.VERSION_CODES.TIRAMISU)
fun getAppVersion(context: Context): String {
    return try {
        val packageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.packageManager.getPackageInfo(
                context.packageName,
                PackageManager.PackageInfoFlags.of(0) // ✅ Solo en Android 13+
            )
        } else {
            @Suppress("DEPRECATION") // Evita advertencias en compilación
            context.packageManager.getPackageInfo(
                context.packageName,
                0 // ✅ Compatible con Android 12 y versiones anteriores
            )
        }
        packageInfo.versionName ?: "Unknown" // Si versionName es null, retorna "Unknown"
    } catch (e: PackageManager.NameNotFoundException) {
        "Unknown" // Si ocurre un error, retorna "Unknown"
    }
}

@RequiresApi(Build.VERSION_CODES.TIRAMISU)
@Composable
fun VersionCard(uriHandler: UriHandler) {
    val context = LocalContext.current
    val appVersion = remember { getAppVersion(context) }


    Spacer(Modifier.height(25.dp))
    ElevatedCard(
        elevation = CardDefaults.cardElevation(
            defaultElevation = 6.dp
        ),
        modifier = Modifier
//            .clip(RoundedCornerShape(38.dp))
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .height(85.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,

            ),
        shape = RoundedCornerShape(38.dp),
        onClick = { uriHandler.openUri("https://github.com/Arturo254/OpenTune/releases/latest") }
    ) {
        Column(
            modifier = Modifier
                .clip(RoundedCornerShape(38.dp))
                .padding(20.dp),
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(Modifier.height(3.dp))
            Text(
                text = " Version: $appVersion",
                style = MaterialTheme.typography.bodyLarge.copy(
                    fontSize = 17.sp,
                    fontFamily = FontFamily.Monospace
                ),
                color = MaterialTheme.colorScheme.secondary,
                modifier = Modifier.align(Alignment.CenterHorizontally),


                )
        }
    }
}




@Composable
fun UpdateCard(latestVersion: String = "") {
    val context = LocalContext.current
    var showUpdateCard by remember { mutableStateOf(false) }
    var currentLatestVersion by remember { mutableStateOf(latestVersion) }
    var showDownloadDialog by remember { mutableStateOf(false) }

    // Verificar actualizaciones al inicio
    LaunchedEffect(Unit) {
        val newVersion = checkForUpdates()
        if (newVersion != null && isNewerVersion(newVersion, BuildConfig.VERSION_NAME)) {
            showUpdateCard = true
            currentLatestVersion = newVersion
        }
    }

    // Diálogo de descarga
    if (showDownloadDialog) {
        UpdateDownloadDialog(
            latestVersion = currentLatestVersion,
            onDismiss = { showDownloadDialog = false }
        )
    }

    // Card de actualización disponible
    if (showUpdateCard) {
        Spacer(Modifier.height(25.dp))
        ElevatedCard(
            elevation = CardDefaults.cardElevation(
                defaultElevation = 6.dp
            ),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .height(120.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
            ),
            shape = RoundedCornerShape(38.dp),
            onClick = {
                showDownloadDialog = true
            }
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp),
                verticalArrangement = Arrangement.Center
            ) {
                Spacer(Modifier.height(3.dp))
                Text(
                    text = "${stringResource(R.string.NewVersion)} $currentLatestVersion",
                    style = MaterialTheme.typography.bodyLarge.copy(
                        fontSize = 17.sp,
                        fontFamily = FontFamily.Monospace
                    ),
                    color = MaterialTheme.colorScheme.secondary,
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    text = stringResource(R.string.tap_to_update),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
fun UpdateDownloadDialog(
    latestVersion: String,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    var downloadProgress by remember { mutableStateOf(0f) }
    var downloadStatus by remember { mutableStateOf(DownloadStatus.NOT_STARTED) }
    var downloadedApkUri by remember { mutableStateOf<Uri?>(null) }
    val downloadScope = rememberCoroutineScope()

    // Solicitar permiso para instalar paquetes
    val installPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (downloadStatus == DownloadStatus.COMPLETED && downloadedApkUri != null) {
            installApk(context, downloadedApkUri!!)
        }
    }

    // Dialog para mostrar progreso y opciones
    Dialog(onDismissRequest = {
        if (downloadStatus != DownloadStatus.DOWNLOADING) {
            onDismiss()
        }
    }) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(28.dp),
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = stringResource(id = R.string.update_version, latestVersion),
                    style = MaterialTheme.typography.headlineSmall
                )

                Spacer(modifier = Modifier.height(16.dp))

                when (downloadStatus) {
                    DownloadStatus.NOT_STARTED -> {
                        Text(stringResource(R.string.download_question))
                        Spacer(modifier = Modifier.height(16.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            TextButton(onClick = onDismiss) {
                                Text(stringResource(R.string.cancel))
                            }
                            Button(onClick = {
                                downloadStatus = DownloadStatus.DOWNLOADING
                                downloadScope.launch {
                                    downloadedApkUri = downloadApk(context, latestVersion) { progress ->
                                        downloadProgress = progress
                                        if (progress >= 1f) {
                                            downloadStatus = DownloadStatus.COMPLETED
                                        }
                                    }
                                }
                            }) {
                                Text(stringResource(R.string.download))
                            }
                        }
                    }

                    DownloadStatus.DOWNLOADING -> {
                        Text(stringResource(R.string.downloadingup))
                        Spacer(modifier = Modifier.height(16.dp))
                        LinearProgressIndicator(
                            progress = { downloadProgress },
                            modifier = Modifier.fillMaxWidth()
                        )
                        Text(
                            text = "${(downloadProgress * 100).toInt()}%",
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }

                    DownloadStatus.COMPLETED -> {
                        Text(stringResource(R.string.download_completed))
                        Spacer(modifier = Modifier.height(16.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            TextButton(onClick = onDismiss) {
                                Text(stringResource(R.string.close))
                            }
                            Button(onClick = {
                                if (downloadedApkUri != null) {
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                        if (!context.packageManager.canRequestPackageInstalls()) {
                                            val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
                                                .setData(Uri.parse("package:${context.packageName}"))
                                            installPermissionLauncher.launch(intent)
                                        } else {
                                            installApk(context, downloadedApkUri!!)
                                        }
                                    } else {
                                        installApk(context, downloadedApkUri!!)
                                    }
                                }
                            }) {
                                Text(stringResource(R.string.install))
                            }
                        }
                    }

                    DownloadStatus.ERROR -> {
                        Text(stringResource(R.string.download_errorup))
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = onDismiss) {
                            Text(stringResource(R.string.close))
                        }
                    }
                }
            }
        }
    }
}


enum class DownloadStatus {
    NOT_STARTED,
    DOWNLOADING,
    COMPLETED,
    ERROR
}

suspend fun downloadApk(
    context: Context,
    version: String,
    onProgressUpdate: (Float) -> Unit
): Uri? = withContext(Dispatchers.IO) {
    try {
        // URL del APK (ajusta esta URL según donde estén alojados tus archivos APK)
        val apkUrl = "https://github.com/Arturo254/OpenTune/releases/download/$version/app-release.apk"

        // Crear archivo de destino
        val downloadDir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
        val apkFile = File(downloadDir, "app-release-$version.apk")

        // Si ya existe, bórralo
        if (apkFile.exists()) {
            apkFile.delete()
        }

        // Configurar el DownloadManager
        val request = DownloadManager.Request(Uri.parse(apkUrl))
            .setTitle("Descargando OpenTune v$version")
            .setDescription("Descargando actualización...")
            .setDestinationUri(Uri.fromFile(apkFile))
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)

        val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val downloadId = downloadManager.enqueue(request)

        // Monitorear el progreso
        var isDownloading = true
        while (isDownloading) {
            val query = DownloadManager.Query().setFilterById(downloadId)
            val cursor = downloadManager.query(query)

            if (cursor.moveToFirst()) {
                val statusColumn = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS)
                val bytesDownloadedColumn = cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)
                val bytesTotalColumn = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)

                if (statusColumn != -1 && bytesDownloadedColumn != -1 && bytesTotalColumn != -1) {
                    val status = cursor.getInt(statusColumn)
                    val bytesDownloaded = cursor.getLong(bytesDownloadedColumn)
                    val bytesTotal = cursor.getLong(bytesTotalColumn)

                    when (status) {
                        DownloadManager.STATUS_SUCCESSFUL -> {
                            isDownloading = false
                            onProgressUpdate(1f)
                        }
                        DownloadManager.STATUS_FAILED -> {
                            isDownloading = false
                            onProgressUpdate(0f)
                            return@withContext null
                        }
                        else -> {
                            if (bytesTotal > 0) {
                                val progress = bytesDownloaded.toFloat() / bytesTotal.toFloat()
                                onProgressUpdate(progress)
                            }
                        }
                    }
                }
            }
            cursor.close()
            delay(100) // Esperar un poco antes de actualizar de nuevo
        }

        // Crear Uri para la instalación con FileProvider
        return@withContext FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            apkFile
        )
    } catch (e: Exception) {
        e.printStackTrace()
        return@withContext null
    }
}

fun installApk(context: Context, uri: Uri) {
    val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(uri, "application/vnd.android.package-archive")
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
    }
    context.startActivity(intent)
}

// Estas funciones ya las tenías
suspend fun checkForUpdates(): String? = withContext(Dispatchers.IO) {
    try {
        val url = URL("https://api.github.com/repos/Arturo254/OpenTune/releases/latest")
        val connection = url.openConnection()
        connection.connect()
        val json = connection.getInputStream().bufferedReader().use { it.readText() }
        val jsonObject = JSONObject(json)
        return@withContext jsonObject.getString("tag_name")
    } catch (e: Exception) {
        e.printStackTrace()
        return@withContext null
    }
}

fun isNewerVersion(remoteVersion: String, currentVersion: String): Boolean {
    val remote = remoteVersion.removePrefix("v").split(".").map { it.toIntOrNull() ?: 0 }
    val current = currentVersion.removePrefix("v").split(".").map { it.toIntOrNull() ?: 0 }

    for (i in 0 until maxOf(remote.size, current.size)) {
        val r = remote.getOrNull(i) ?: 0
        val c = current.getOrNull(i) ?: 0
        if (r > c) return true
        if (r < c) return false
    }
    return false
}

@RequiresApi(Build.VERSION_CODES.TIRAMISU)
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    latestVersion: Long,
    navController: NavController,
    scrollBehavior: TopAppBarScrollBehavior,
) {


    val uriHandler = LocalUriHandler.current


//    var isBetaFunEnabled by remember { mutableStateOf(false) }


    val backgroundImages = listOf(

        R.drawable.cardbg,
        R.drawable.cardbg2,
        R.drawable.cardbg3,
        R.drawable.cardbg4,
        R.drawable.cardbg6,
        R.drawable.cardbg7,
        R.drawable.cardbg8,
        R.drawable.cardbg9,
        R.drawable.cardbg11,
        R.drawable.cardbg12,
        R.drawable.cardbg13,
        R.drawable.cardbg14,
        R.drawable.cardbg15,
        R.drawable.cardbg16,
        R.drawable.cardbg17,
        R.drawable.cardbg18,
        R.drawable.cardbg19,
        R.drawable.cardbg20,
        R.drawable.cardbg22,
        R.drawable.cardbg23,
        R.drawable.cardbg24,
        R.drawable.cardbg25,
        R.drawable.cardbg26,
        R.drawable.cardbg27,
        R.drawable.cardbg28,
        R.drawable.cardbg29,


        )
    var currentImageIndex by remember { mutableIntStateOf((0..backgroundImages.lastIndex).random()) }
    var previousImageIndex by remember { mutableIntStateOf(currentImageIndex) }
    var isAnimating by remember { mutableStateOf(false) }

    val alpha by animateFloatAsState(
        targetValue = if (isAnimating) 0f else 1f,
        animationSpec = tween(300),
        finishedListener = {
            if (isAnimating) {
                previousImageIndex = currentImageIndex
                isAnimating = false
            }
        }, label = ""
    )

    fun changeBackgroundImage() {
        if (!isAnimating) {
            isAnimating = true
            currentImageIndex = (currentImageIndex + 1) % backgroundImages.size
        }
    }

    Column(
        modifier = Modifier
            .windowInsetsPadding(LocalPlayerAwareWindowInsets.current)
            .verticalScroll(rememberScrollState())
    ) {
        Spacer(Modifier.height(20.dp))
        Box(
            modifier = Modifier
                .height(220.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(color = Color.Transparent)
                .clickable { changeBackgroundImage() }
        ) {
            // Imagen anterior que se desvanece
            Image(
                painter = painterResource(id = backgroundImages[previousImageIndex]),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxSize()
                    .blur(0.6.dp)
                    .alpha(alpha)
            )

            // Nueva imagen que aparece
            Image(
                painter = painterResource(id = backgroundImages[currentImageIndex]),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxSize()
                    .blur(0.6.dp)
                    .alpha(1f - alpha)
            )

            val accountName by rememberPreference(AccountNameKey, "")
            val innerTubeCookie by rememberPreference(InnerTubeCookieKey, "")
            val isLoggedIn = remember(innerTubeCookie) {
                "SAPISID" in parseCookieString(innerTubeCookie)
            }

            PreferenceEntry(
                title = {
                    Column(
                        modifier = Modifier.padding(16.dp),
                    ) {
                        if (isLoggedIn) {
                            Text(
                                stringResource(R.string.Hi),
                                color = Color.White,
                                fontSize = 20.sp,
                                style = MaterialTheme.typography.titleSmall,
                                fontFamily = FontFamily.SansSerif
                            )
                            Spacer(modifier = Modifier.height(3.dp))
                            Text(
                                accountName.replace("@", ""),
                                color = Color.White,
                                fontSize = 20.sp,
                                style = MaterialTheme.typography.titleSmall,
                                fontFamily = FontFamily.Monospace
                            )
                        } else {
                            Icon(
                                painter = painterResource(R.drawable.opentune_monochrome),
                                contentDescription = null,
                                tint = Color.White,
                            )
                            Text(
                                text = "OpenTune",
                                color = Color.White,
                                fontSize = 26.sp,
                                style = MaterialTheme.typography.titleSmall,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                },
                description = null,
                onClick = { changeBackgroundImage() },
            )
        }


        Spacer(Modifier.height(25.dp))

        PreferenceEntry(
            title = { Text(stringResource(R.string.appearance)) },
            icon = { Icon(painterResource(R.drawable.palette), null) },
            onClick = { navController.navigate("settings/appearance") },
        )
        PreferenceEntry(
            title = { Text(stringResource(R.string.account)) },
            icon = { Icon(painterResource(R.drawable.person), null) },
            onClick = { navController.navigate("settings/account") },
        )
        PreferenceEntry(
            title = { Text(stringResource(R.string.content)) },
            icon = { Icon(painterResource(R.drawable.language), null) },
            onClick = { navController.navigate("settings/content") },
        )
        PreferenceEntry(
            title = { Text(stringResource(R.string.player_and_audio)) },
            icon = { Icon(painterResource(R.drawable.play), null) },
            onClick = { navController.navigate("settings/player") },
        )
        PreferenceEntry(
            title = { Text(stringResource(R.string.storage)) },
            icon = { Icon(painterResource(R.drawable.storage), null) },
            onClick = { navController.navigate("settings/storage") },
        )
        PreferenceEntry(
            title = { Text(stringResource(R.string.privacy)) },
            icon = { Icon(painterResource(R.drawable.security), null) },
            onClick = { navController.navigate("settings/privacy") },
        )
        PreferenceEntry(
            title = { Text(stringResource(R.string.backup_restore)) },
            icon = { Icon(painterResource(R.drawable.restore), null) },
            onClick = { navController.navigate("settings/backup_restore") },
        )
        PreferenceEntry(
            title = { Text(stringResource(R.string.about)) },
            icon = { Icon(painterResource(R.drawable.info), null) },
            onClick = { navController.navigate("settings/about") }
        )
        PreferenceEntry(
            title = { Text(stringResource(R.string.Donate)) },
            icon = { Icon(painterResource(R.drawable.donate), null) },
            onClick = { uriHandler.openUri("https://buymeacoffee.com/arturocervantes") }
        )

        PreferenceEntry(
            title = { Text(stringResource(R.string.Telegramchanel)) },
            icon = { Icon(painterResource(R.drawable.telegram), null) },
            onClick = { uriHandler.openUri("https://t.me/OpenTune_chat") }
        )

        TranslatePreference(uriHandler = uriHandler)

        ChangelogButtonWithPopup()



        UpdateCard()
        Spacer(Modifier.height(25.dp))


        VersionCard(uriHandler)

        Spacer(Modifier.height(25.dp))


    }

    TopAppBar(


        title = { Text(stringResource(R.string.settings)) },
        modifier = Modifier
            .clip(RoundedCornerShape(bottomStart = 20.dp, bottomEnd = 20.dp)),
        navigationIcon = {
            IconButton(
                onClick = navController::navigateUp,
                onLongClick = navController::backToMain,
            )

            {
                Icon(
                    painterResource(R.drawable.arrow_back),
                    contentDescription = null,
                )
            }
        },
        scrollBehavior = scrollBehavior

    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChangelogButtonWithPopup() {
    var showBottomSheet by remember { mutableStateOf(false) }

    PreferenceEntry(
        title = { Text(stringResource(R.string.Changelog)) },
        icon = { Icon(painterResource(R.drawable.schedule), null) },
        onClick = { showBottomSheet = true }
    )

    if (showBottomSheet) {
        ModalBottomSheet(
            onDismissRequest = { showBottomSheet = false },
            sheetState = rememberModalBottomSheetState(),
            containerColor = MaterialTheme.colorScheme.surface,
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            ) {
                Column(
                    modifier = Modifier
                        .verticalScroll(rememberScrollState())
                ) {
                    ChangelogScreen()
                    Spacer(Modifier.height(20.dp))
                }
            }
        }
    }
}

@Composable
fun AutoChangelogCard(repoOwner: String, repoName: String) {
    var changes by remember { mutableStateOf<List<String>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(key1 = Unit) {
        try {
            changes = fetchLatestChanges(repoOwner, repoName)
            isLoading = false
        } catch (e: Exception) {
            error = "Error al cargar los cambios: ${e.message}"
            isLoading = false
        }
    }

    ElevatedCard(
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
        modifier = Modifier
            .clip(RoundedCornerShape(28.dp))
            .fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
        )
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.Top
        ) {
            Text(
                stringResource(R.string.changelogs),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(Modifier.height(8.dp))
            when {
                isLoading -> CircularProgressIndicator()
                error != null -> Text(
                    text = error!!,
                    color = MaterialTheme.colorScheme.error
                )

                changes.isEmpty() -> Text(stringResource(R.string.no_changes))
                else -> changes.forEach { change ->
                    Text(
                        text = "• $change",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontSize = 14.sp,
                            fontFamily = FontFamily.Monospace
                        ),
                        color = MaterialTheme.colorScheme.secondary,
                        modifier = Modifier.padding(vertical = 2.dp)
                    )
                }
            }
        }
    }
}

suspend fun fetchLatestChanges(owner: String, repo: String): List<String> =
    withContext(Dispatchers.IO) {
        val url = URL("https://api.github.com/repos/$owner/$repo/releases/latest")
        val connection = url.openConnection()
        connection.setRequestProperty("Accept", "application/vnd.github.v3+json")

        val response = connection.getInputStream().bufferedReader().use { it.readText() }
        val jsonObject = JSONObject(response)
        val body = jsonObject.getString("body")

        return@withContext body.lines()
            .filter { it.trim().startsWith("-") || it.trim().startsWith("*") }
            .map { it.trim().removePrefix("-").removePrefix("*").trim() }
    }

@Composable
fun ChangelogScreen() {
    AutoChangelogCard(repoOwner = "Arturo254", repoName = "OpenTune")
}

@Composable
fun TranslatePreference(uriHandler: UriHandler) {
    var showDialog by remember { mutableStateOf(false) }

   PreferenceEntry(
        title = { Text(stringResource(R.string.Translate)) },
        icon = { Icon(painterResource(R.drawable.translate), null) },
        onClick = { showDialog = true }
    )

    if (showDialog) {
        AlertDialog(
            onDismissRequest = { showDialog = false },
            title = { Text(stringResource(R.string.Redirección)) },
            text = { Text(stringResource(R.string.poeditor_redirect)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDialog = false
                        uriHandler.openUri("https://poeditor.com/join/project/208BwCVazA")
                    }
                ) {
                    Text("OK")
                }
            }
        )
    }
}


