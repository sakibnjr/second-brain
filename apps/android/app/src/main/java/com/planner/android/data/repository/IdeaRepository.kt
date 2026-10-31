package com.planner.android.data.repository

import android.content.Context
import com.planner.android.data.dao.IdeaDao
import com.planner.android.data.dao.MutationQueueDao
import com.planner.android.data.models.IdeaEntity
import com.planner.android.data.models.MutationQueueEntity
import com.planner.android.sync.SupabaseClient
import com.planner.android.sync.SyncWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

class IdeaRepository(
    private val ideaDao: IdeaDao,
    private val mutationQueueDao: MutationQueueDao,
    private val context: Context? = null
) {
    val activeIdeas: Flow<List<IdeaEntity>> = ideaDao.getActiveIdeasFlow()
    val archivedIdeas: Flow<List<IdeaEntity>> = ideaDao.getArchivedIdeasFlow()

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    private fun toPayloadJson(idea: IdeaEntity): String {
        return JSONObject().apply {
            put("id", idea.id)
            put("title", idea.title)
            put("content", idea.content)
            put("archived_at", idea.archivedAt ?: JSONObject.NULL)
            put("tags", JSONArray(idea.tags))
            put("created_at", idea.createdAt)
            put("updated_at", idea.updatedAt)
            put("deleted_at", idea.deletedAt ?: JSONObject.NULL)
            put("version", idea.version)
        }.toString()
    }

    suspend fun createIdea(title: String, content: String = "", tags: List<String> = emptyList()): IdeaEntity {
        val now = isoFormat.format(Date())
        val idea = IdeaEntity(
            id = UUID.randomUUID().toString(),
            title = title.trim(),
            content = content.trim(),
            tags = tags,
            createdAt = now,
            updatedAt = now
        )
        ideaDao.insertIdea(idea)

        mutationQueueDao.insertMutation(
            MutationQueueEntity(
                entityType = "idea",
                entityId = idea.id,
                operation = "insert",
                payloadJson = toPayloadJson(idea),
                clientTimestamp = now
            )
        )

        context?.let { ctx ->
            SyncWorker.enqueueImmediateSync(ctx)
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    SupabaseClient.getInstance(ctx).syncNow()
                } catch (_: Exception) {}
            }
        }
        return idea
    }

    suspend fun toggleArchive(idea: IdeaEntity) {
        val now = isoFormat.format(Date())
        val newArchivedAt = if (idea.archivedAt == null) now else null
        val updated = idea.copy(
            archivedAt = newArchivedAt,
            updatedAt = now,
            version = idea.version + 1
        )
        ideaDao.updateIdea(updated)

        mutationQueueDao.insertMutation(
            MutationQueueEntity(
                entityType = "idea",
                entityId = updated.id,
                operation = "update",
                payloadJson = toPayloadJson(updated),
                clientTimestamp = now
            )
        )

        context?.let { ctx ->
            SyncWorker.enqueueImmediateSync(ctx)
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    SupabaseClient.getInstance(ctx).syncNow()
                } catch (_: Exception) {}
            }
        }
    }

    suspend fun deleteIdea(ideaId: String) {
        val now = isoFormat.format(Date())
        val existing = ideaDao.getIdeaById(ideaId)
        ideaDao.softDeleteIdea(ideaId, now)

        val payload = if (existing != null) {
            toPayloadJson(existing.copy(deletedAt = now, updatedAt = now))
        } else {
            JSONObject().apply {
                put("id", ideaId)
                put("deleted_at", now)
                put("updated_at", now)
            }.toString()
        }

        mutationQueueDao.insertMutation(
            MutationQueueEntity(
                entityType = "idea",
                entityId = ideaId,
                operation = "delete",
                payloadJson = payload,
                clientTimestamp = now
            )
        )

        context?.let { ctx ->
            SyncWorker.enqueueImmediateSync(ctx)
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    SupabaseClient.getInstance(ctx).syncNow()
                } catch (_: Exception) {}
            }
        }
    }
}
