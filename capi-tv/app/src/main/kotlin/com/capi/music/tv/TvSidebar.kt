package com.capi.music.tv

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Album
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.LibraryMusic
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.PlaylistPlay
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.capi.music.R
import com.capi.music.tv.components.TvTextSecondary
import com.capi.music.tv.components.tvFocusable

private val SidebarItemShape = RoundedCornerShape(14.dp)
private val SidebarWidth = 200.dp

private data class TvSidebarItem(
    val icon: ImageVector,
    val label: String,
    val route: TvRoute,
)

@Composable
fun TvSidebar(
    current: TvRoute,
    onSelect: (TvRoute) -> Unit,
) {
    val items =
        listOf(
            TvSidebarItem(Icons.Rounded.Home, stringResource(R.string.home), TvRoute.Home),
            TvSidebarItem(Icons.Rounded.Search, stringResource(R.string.search), TvRoute.Search),
            TvSidebarItem(Icons.Rounded.LibraryMusic, stringResource(R.string.tv_library), TvRoute.Library),
            TvSidebarItem(Icons.Rounded.PlaylistPlay, stringResource(R.string.tv_playlists), TvRoute.Playlists),
            TvSidebarItem(Icons.Rounded.Person, stringResource(R.string.tv_artists), TvRoute.Artists),
            TvSidebarItem(Icons.Rounded.Album, stringResource(R.string.tv_albums), TvRoute.Albums),
            TvSidebarItem(Icons.Rounded.Settings, stringResource(R.string.settings), TvRoute.Settings),
        )

    Column(
        modifier =
            Modifier
                .width(SidebarWidth)
                .fillMaxHeight()
                .background(Color.Black.copy(alpha = 0.35f)),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(start = 20.dp, top = 26.dp, bottom = 26.dp),
        ) {
            Image(
                painter = painterResource(R.drawable.capi_logo),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(42.dp).clip(RoundedCornerShape(11.dp)),
            )
            Spacer(Modifier.width(12.dp))
            Text(
                text = stringResource(R.string.app_name),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )
        }

        items.forEach { item ->
            val selected = item.route.key == current.key
            var focused by remember { mutableStateOf(false) }
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                        .onFocusChanged { focused = it.isFocused || it.hasFocus }
                        .tvFocusable(
                            shape = SidebarItemShape,
                            ringWidth = 2.dp,
                            scale = 1.06f,
                            onClick = { onSelect(item.route) },
                        )
                        .background(
                            when {
                                focused -> MaterialTheme.colorScheme.primary.copy(alpha = 0.14f)
                                selected -> Color.White.copy(alpha = 0.05f)
                                else -> Color.Transparent
                            },
                            SidebarItemShape,
                        )
                        .padding(horizontal = 16.dp, vertical = 13.dp),
            ) {
                Box(
                    modifier =
                        Modifier
                            .width(4.dp)
                            .height(24.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(
                                if (selected) MaterialTheme.colorScheme.primary
                                else Color.Transparent,
                            ),
                )
                Spacer(Modifier.width(14.dp))
                Icon(
                    imageVector = item.icon,
                    contentDescription = null,
                    tint =
                        if (selected || focused) MaterialTheme.colorScheme.primary
                        else TvTextSecondary,
                    modifier = Modifier.size(24.dp),
                )
                Spacer(Modifier.width(14.dp))
                Text(
                    text = item.label,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = if (selected || focused) FontWeight.Bold else FontWeight.Medium,
                    color =
                        if (selected || focused) MaterialTheme.colorScheme.primary
                        else TvTextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}