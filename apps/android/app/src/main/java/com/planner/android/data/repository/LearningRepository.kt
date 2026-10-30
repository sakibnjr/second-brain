package com.planner.android.data.repository

import com.planner.android.data.dao.LearningDao
import com.planner.android.data.dao.MutationQueueDao
import com.planner.android.data.models.LearningResourceEntity
import com.planner.android.data.models.MutationQueueEntity
import kotlinx.coroutines.flow.Flow
import java.text.SimpleDateFormat
import java.util.*

class LearningRepository(
    private val learningDao: LearningDao,
    private val mutationQueueDao: MutationQueueDao
) {
    val allResources: Flow<List<LearningResourceEntity>> = learningDao.getAllResourcesFlow()
    val activeResources: Flow<List<LearningResourceEntity>> = learningDao.getActiveResourcesFlow()

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
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
                payloadJson = """{"id":"${resource.id}","title":"${resource.title}","status":"${resource.status}"}""",
                clientTimestamp = now
            )
        )
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

        mutationQueueDao.insertMutation(
            MutationQueueEntity(
                entityType = "learning_resource",
                entityId = resourceId,
                operation = "update",
                payloadJson = """{"id":"$resourceId","progress_percent":$progressPercent,"status":"$newStatus"}""",
                clientTimestamp = now
            )
        )
    }

    suspend fun deleteResource(resourceId: String) {
        val now = isoFormat.format(Date())
        learningDao.softDeleteResource(resourceId, now)

        mutationQueueDao.insertMutation(
            MutationQueueEntity(
                entityType = "learning_resource",
                entityId = resourceId,
                operation = "delete",
                payloadJson = """{"id":"$resourceId","deleted_at":"$now"}""",
                clientTimestamp = now
            )
        )
    }
}
