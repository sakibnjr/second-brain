package com.planner.android.data.repository

import com.planner.android.data.dao.MutationQueueDao
import com.planner.android.data.dao.TaskDao
import com.planner.android.data.models.MutationQueueEntity
import com.planner.android.data.models.TaskEntity
import kotlinx.coroutines.flow.Flow
import java.text.SimpleDateFormat
import java.util.*

class TaskRepository(
    private val taskDao: TaskDao,
    private val mutationQueueDao: MutationQueueDao
) {
    val allTasks: Flow<List<TaskEntity>> = taskDao.getAllTasksFlow()

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    private val dateOnlyFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    fun getTodayTasks(): Flow<List<TaskEntity>> {
        val todayStr = dateOnlyFormat.format(Date())
        return taskDao.getTodayTasksFlow(todayStr)
    }

    fun getOverdueTasks(): Flow<List<TaskEntity>> {
        val todayStr = dateOnlyFormat.format(Date())
        return taskDao.getOverdueTasksFlow(todayStr)
    }

    suspend fun createTask(
        title: String,
        description: String? = null,
        priority: String = "medium",
        dueAt: String? = null,
        tags: List<String> = emptyList()
    ): TaskEntity {
        val now = isoFormat.format(Date())
        val task = TaskEntity(
            id = UUID.randomUUID().toString(),
            title = title.trim(),
            description = description?.trim(),
            status = "todo",
            priority = priority,
            dueAt = dueAt,
            tags = tags,
            createdAt = now,
            updatedAt = now
        )
        taskDao.insertTask(task)

        // Queue mutation for offline sync
        mutationQueueDao.insertMutation(
            MutationQueueEntity(
                entityType = "task",
                entityId = task.id,
                operation = "insert",
                payloadJson = """{"id":"${task.id}","title":"${task.title}","status":"${task.status}","priority":"${task.priority}"}""",
                clientTimestamp = now
            )
        )
        return task
    }

    suspend fun updateTaskStatus(task: TaskEntity, newStatus: String) {
        val now = isoFormat.format(Date())
        taskDao.updateTaskStatus(task.id, newStatus, now)

        mutationQueueDao.insertMutation(
            MutationQueueEntity(
                entityType = "task",
                entityId = task.id,
                operation = "update",
                payloadJson = """{"id":"${task.id}","status":"$newStatus"}""",
                clientTimestamp = now
            )
        )
    }

    suspend fun deleteTask(taskId: String) {
        val now = isoFormat.format(Date())
        taskDao.softDeleteTask(taskId, now)

        mutationQueueDao.insertMutation(
            MutationQueueEntity(
                entityType = "task",
                entityId = taskId,
                operation = "delete",
                payloadJson = """{"id":"$taskId","deleted_at":"$now"}""",
                clientTimestamp = now
            )
        )
    }
}
