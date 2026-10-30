package com.planner.android.data.dao

import androidx.room.*
import com.planner.android.data.models.LearningResourceEntity
import com.planner.android.data.models.StudySessionEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface LearningDao {
    @Query("SELECT * FROM learning_resources WHERE deletedAt IS NULL ORDER BY status ASC, updatedAt DESC")
    fun getAllResourcesFlow(): Flow<List<LearningResourceEntity>>

    @Query("SELECT * FROM learning_resources WHERE deletedAt IS NULL AND status = 'in_progress' ORDER BY updatedAt DESC")
    fun getActiveResourcesFlow(): Flow<List<LearningResourceEntity>>

    @Query("SELECT * FROM learning_resources WHERE id = :id LIMIT 1")
    suspend fun getResourceById(id: String): LearningResourceEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertResource(resource: LearningResourceEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertResources(resources: List<LearningResourceEntity>)

    @Update
    suspend fun updateResource(resource: LearningResourceEntity)

    @Query("UPDATE learning_resources SET progressPercent = :progress, status = :status, updatedAt = :updatedAt WHERE id = :id")
    suspend fun updateProgress(id: String, progress: Int, status: String, updatedAt: String)

    @Query("UPDATE learning_resources SET deletedAt = :deletedAt, updatedAt = :deletedAt WHERE id = :id")
    suspend fun softDeleteResource(id: String, deletedAt: String)

    @Query("DELETE FROM learning_resources WHERE id = :id")
    suspend fun hardDeleteResource(id: String)

    @Query("SELECT * FROM study_sessions WHERE resourceId = :resourceId AND deletedAt IS NULL ORDER BY startedAt DESC")
    fun getStudySessionsFlow(resourceId: String): Flow<List<StudySessionEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStudySession(session: StudySessionEntity)
}
