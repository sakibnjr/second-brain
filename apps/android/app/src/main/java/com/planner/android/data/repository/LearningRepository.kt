package com.planner.android.data.repository

import android.content.Context
import com.planner.android.data.dao.LearningDao
import com.planner.android.data.dao.MutationQueueDao
import com.planner.android.data.models.LearningResourceEntity
import com.planner.android.data.models.MutationQueueEntity
import com.planner.android.sync.SupabaseClient
import com.planner.android.sync.SyncWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

class LearningRepository(
    private val learningDao: LearningDao,
    private val mutationQueueDao: MutationQueueDao,
    private val context: Context? = null
) {
    val allResources: Flow<List<LearningResourceEntity>> = learningDao.getAllResourcesFlow()
    val activeResources: Flow<List<LearningResourceEntity>> = learningDao.getActiveResourcesFlow()

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    private fun toPayloadJson(resource: LearningResourceEntity): String {
        return JSONObject().apply {
            put("id", resource.id)
            put("title", resource.title)
            put("url", resource.url ?: JSONObject.NULL)
            put("provider", resource.provider ?: JSONObject.NULL)
            put("status", resource.status)
            put("progress_percent", resource.progressPercent)
            put("notes", resource.notes ?: JSONObject.NULL)
            put("created_at", resource.createdAt)
            put("updated_at", resource.updatedAt)
            put("deleted_at", resource.deletedAt ?: JSONObject.NULL)
            put("version", resource.version)
        }.toString()
    }

    suspend fun createResource(
        title: String,
        url: String? = null,
        provider: String? = null
    ): LearningResourceEntity {
        val now = isoFormat.format(Date())
        val resource = LearningResourceEntity(
            id = UUID.randomUUID().toString(),
            title = title.trim(),
            url = url?.trim(),
            provider = provider?.trim(),
            status = "in_progress",
            progressPercent = 0,
            createdAt = now,
            updatedAt = now
        )
        learningDao.insertResource(resource)

        mutationQueueDao.insertMutation(
            MutationQueueEntity(
                entityType = "learning_resource",
                entityId = resource.id,
                operation = "insert",
                payloadJson = toPayloadJson(resource),
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
        return resource
    }

    suspend fun updateProgress(resourceId: String, progressPercent: Int) {
        val now = isoFormat.format(Date())
        val newStatus = when {
            progressPercent >= 100 -> "completed"
            progressPercent > 0 -> "in_progress"
            else -> "planned"
        }
        learningDao.updateProgress(resourceId, progressPercent, newStatus, now)
        val updated = learningDao.getResourceById(resourceId)

        val payload = if (updated != null) {
            toPayloadJson(updated)
        } else {
            JSONObject().apply {
                put("id", resourceId)
                put("progress_percent", progressPercent)
                put("status", newStatus)
                put("updated_at", now)
            }.toString()
        }

        mutationQueueDao.insertMutation(
            MutationQueueEntity(
                entityType = "learning_resource",
                entityId = resourceId,
                operation = "update",
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

    suspend fun deleteResource(resourceId: String) {
        val now = isoFormat.format(Date())
        val existing = learningDao.getResourceById(resourceId)
        learningDao.softDeleteResource(resourceId, now)

        val payload = if (existing != null) {
            toPayloadJson(existing.copy(deletedAt = now, updatedAt = now))
        } else {
            JSONObject().apply {
                put("id", resourceId)
                put("deleted_at", now)
                put("updated_at", now)
            }.toString()
        }

        mutationQueueDao.insertMutation(
            MutationQueueEntity(
                entityType = "learning_resource",
                entityId = resourceId,
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
