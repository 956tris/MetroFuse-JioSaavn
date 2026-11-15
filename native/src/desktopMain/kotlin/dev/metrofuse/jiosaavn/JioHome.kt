// Metrolist Project (C) 2026, GPL-3.0. See SOURCE.
package dev.metrofuse.jiosaavn

import dev.metrofuse.api.HomeItem
import dev.metrofuse.api.HomeLayout
import dev.metrofuse.api.HomeShelf
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject

internal object JioHome {
    private val languages =
        mapOf(
            "en" to "english", "hi" to "hindi", "pa" to "punjabi", "ta" to "tamil", "te" to "telugu",
            "bn" to "bengali", "mr" to "marathi", "gu" to "gujarati", "kn" to "kannada", "ml" to "malayalam",
            "ur" to "urdu", "or" to "odia", "as" to "assamese", "bh" to "bhojpuri", "raj" to "rajasthani", "bgc" to "haryanvi",
        )

    fun language(locale: String): String {
        val code = locale.lowercase().substringBefore('-').substringBefore('_')
        return languages[code] ?: code.takeIf { it in languages.values } ?: "hindi,english"
    }

    fun item(value: JsonObject, type: String? = value.text("type"), cardsOnly: Boolean = false): HomeItem? =
        when (type) {
            "song" -> JioCatalog.song(value)?.let { HomeItem(track = it) }
            "album" -> JioCatalog.album(value, "")?.takeIf { it.id.isNotBlank() && it.title.isNotBlank() }
                ?.let { HomeItem(album = if (cardsOnly) it.copy(tracks = emptyList()) else it) }
            "artist" -> JioCatalog.artist(value, "")?.takeIf { it.id.isNotBlank() && it.name.isNotBlank() }
                ?.let { HomeItem(artist = if (cardsOnly) it.copy(tracks = emptyList(), albums = emptyList()) else it) }
            "playlist" -> JioCatalog.playlist(value, "")?.takeIf { it.id.isNotBlank() && it.title.isNotBlank() }
                ?.let { HomeItem(playlist = if (cardsOnly) it.copy(tracks = emptyList()) else it) }
            else -> null
        }

    fun shelf(title: String, items: List<HomeItem>): HomeShelf? =
        items.distinct()
            .takeIf(List<HomeItem>::isNotEmpty)
            ?.let { HomeShelf(title, it, if (it.all { item -> item.track != null }) HomeLayout.ROWS_GRID else HomeLayout.CARDS) }

    fun shelves(data: JsonObject): List<HomeShelf> =
        data
            .obj("modules")
            .entries
            .mapNotNull { (key, value) -> (value as? JsonObject)?.let { key to it } }
            .sortedBy { (_, module) -> module.text("position")?.toIntOrNull() ?: 0 }
            .mapNotNull { (key, module) ->
                val title = JioCatalog.decode(module.text("title")).trim().takeIf(String::isNotEmpty) ?: return@mapNotNull null
                val values = data[key] as? JsonArray ?: module.text("source")?.let(data::get)
                val items = values.objects().mapNotNull { item(it, cardsOnly = true) }
                shelf(title, items.take(40))
            }.take(20)
}
