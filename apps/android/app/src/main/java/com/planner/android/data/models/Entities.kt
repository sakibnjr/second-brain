package com.planner.android.data.models

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "tasks")
data class TaskEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val userId: String? = null,
    val title: String,
    val description: String? = null,
    val status: String = "todo", // todo, in_progress, completed
    val priority: String = "medium", // low, medium, high
    val dueAt: String? = null,
    val reminderAt: String? = null,
    val tags: List<String> = emptyList(),
    val createdAt: String,
    val updatedAt: String,
    val deletedAt: String? = null,
    val version: Long = 1
)

@Entity(tableName = "ideas")
data class IdeaEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val userId: String? = null,
    val title: String,
    val content: String = "",
    val archivedAt: String? = null,
    val tags: List<String> = emptyList(),
    val createdAt: String,
    val updatedAt: String,
    val deletedAt: String? = null,
    val version: Long = 1
)

@Entity(tableName = "learning_resources")
data class LearningResourceEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val userId: String? = null,
    val title: String,
    val url: String? = null,
    val provider: String? = null,
    val status: String = "planned", // planned, in_progress, completed, paused
    val progressPercent: Int = 0,
    val notes: String? = null,
    val createdAt: String,
    val updatedAt: String,
    val deletedAt: String? = null,
    val version: Long = 1
)

@Entity(tableName = "study_sessions")
data class StudySessionEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val userId: String? = null,
    val resourceId: String,
    val startedAt: String,
    val durationMinutes: Int,
    val notes: String? = null,
    val createdAt: String,
    val updatedAt: String,
    val deletedAt: String? = null,
    val version: Long = 1
)

@Entity(tableName = "reminders")
data class ReminderEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val userId: String? = null,
    val taskId: String,
    val remindAt: String,
    val status: String = "pending", // pending, fired, dismissed
    val createdAt: String,
    val updatedAt: String,
    val deletedAt: String? = null,
    val version: Long = 1
)

@Entity(tableName = "mutation_queue")
data class MutationQueueEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val entityType: String, // task, idea, learning_resource, study_session, reminder
    val entityId: String,
    val operation: String, // insert, update, delete
    val payloadJson: String,
    val clientTimestamp: String,
    val status: String = "pending", // pending, syncing, synced, failed
    val retryCount: Int = 0,
    val lastError: String? = null
)
