package com.planner.android.data.repository

import com.planner.android.data.dao.IdeaDao
import com.planner.android.data.dao.MutationQueueDao
import com.planner.android.data.models.IdeaEntity
import com.planner.android.data.models.MutationQueueEntity
import kotlinx.coroutines.flow.Flow
import java.text.SimpleDateFormat
import java.util.*

class IdeaRepository(
    private val ideaDao: IdeaDao,
    private val mutationQueueDao: MutationQueueDao
) {
    val activeIdeas: Flow<List<IdeaEntity>> = ideaDao.getActiveIdeasFlow()
    val archivedIdeas: Flow<List<IdeaEntity>> = ideaDao.getArchivedIdeasFlow()

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
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
                payloadJson = """{"id":"${idea.id}","title":"${idea.title}","content":"${idea.content}"}""",
                clientTimestamp = now
            )
        )
        return idea
    }

    suspend fun toggleArchive(idea: IdeaEntity) {
        val now = isoFormat.format(Date())
        val newArchivedAt = if (idea.archivedAt == null) now else null
        ideaDao.setArchivedStatus(idea.id, newArchivedAt, now)

        mutationQueueDao.insertMutation(
            MutationQueueEntity(
                entityType = "idea",
                entityId = idea.id,
                operation = "update",
                payloadJson = """{"id":"${idea.id}","archived_at":${if (newArchivedAt == null) "null" else "\"$newArchivedAt\""}}""",
                clientTimestamp = now
            )
        )
    }

    suspend fun deleteIdea(ideaId: String) {
        val now = isoFormat.format(Date())
        ideaDao.softDeleteIdea(ideaId, now)

        mutationQueueDao.insertMutation(
            MutationQueueEntity(
                entityType = "idea",
                entityId = ideaId,
                operation = "delete",
                payloadJson = """{"id":"$ideaId","deleted_at":"$now"}""",
                clientTimestamp = now
            )
        )
    }
}
