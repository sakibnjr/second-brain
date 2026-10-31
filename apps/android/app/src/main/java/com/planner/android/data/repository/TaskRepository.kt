package com.planner.android.data.repository

import android.content.Context
import com.planner.android.data.dao.MutationQueueDao
import com.planner.android.data.dao.TaskDao
import com.planner.android.data.models.MutationQueueEntity
import com.planner.android.data.models.TaskEntity
import com.planner.android.notifications.ReminderScheduler
import com.planner.android.sync.SyncWorker
import kotlinx.coroutines.flow.Flow
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

class TaskRepository(
    private val taskDao: TaskDao,
    private val mutationQueueDao: MutationQueueDao,
    private val context: Context? = null
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

    private fun toPayloadJson(task: TaskEntity): String {
        return JSONObject().apply {
            put("id", task.id)
            put("title", task.title)
            put("description", task.description ?: JSONObject.NULL)
            put("status", task.status)
            put("priority", task.priority)
            put("due_at", task.dueAt ?: JSONObject.NULL)
            put("reminder_at", task.reminderAt ?: JSONObject.NULL)
            put("tags", JSONArray(task.tags))
            put("created_at", task.createdAt)
            put("updated_at", task.updatedAt)
            put("deleted_at", task.deletedAt ?: JSONObject.NULL)
            put("version", task.version)
        }.toString()
    }

    suspend fun createTask(
        title: String,
        description: String? = null,
        priority: String = "medium",
        dueAt: String? = null,
        reminderAt: String? = null,
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
            reminderAt = reminderAt,
            tags = tags,
            createdAt = now,
            updatedAt = now
        )
        taskDao.insertTask(task)

        context?.let {
            ReminderScheduler.scheduleTaskReminder(it, task)
        }

        // Queue mutation for offline sync
        mutationQueueDao.insertMutation(
            MutationQueueEntity(
                entityType = "task",
                entityId = task.id,
                operation = "insert",
                payloadJson = toPayloadJson(task),
                clientTimestamp = now
            )
        )

        context?.let { SyncWorker.enqueueImmediateSync(it) }
        return task
    }

    suspend fun updateTaskStatus(task: TaskEntity, newStatus: String) {
        val now = isoFormat.format(Date())
        val updated = task.copy(
            status = newStatus,
            updatedAt = now,
            version = task.version + 1
        )
        taskDao.updateTask(updated)

        context?.let {
            ReminderScheduler.scheduleTaskReminder(it, updated)
        }

        mutationQueueDao.insertMutation(
            MutationQueueEntity(
                entityType = "task",
                entityId = updated.id,
                operation = "update",
                payloadJson = toPayloadJson(updated),
                clientTimestamp = now
            )
        )

        context?.let { SyncWorker.enqueueImmediateSync(it) }
    }

    suspend fun deleteTask(taskId: String) {
        val now = isoFormat.format(Date())
        val existing = taskDao.getTaskById(taskId)
        taskDao.softDeleteTask(taskId, now)

        context?.let {
            ReminderScheduler.cancelTaskReminder(it, taskId)
        }

        val payload = if (existing != null) {
            toPayloadJson(existing.copy(deletedAt = now, updatedAt = now))
        } else {
            JSONObject().apply {
                put("id", taskId)
                put("deleted_at", now)
                put("updated_at", now)
            }.toString()
        }

        mutationQueueDao.insertMutation(
            MutationQueueEntity(
                entityType = "task",
                entityId = taskId,
                operation = "delete",
                payloadJson = payload,
                clientTimestamp = now
            )
        )

        context?.let { SyncWorker.enqueueImmediateSync(it) }
    }
}
