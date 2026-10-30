package com.planner.android.data.dao

import androidx.room.*
import com.planner.android.data.models.IdeaEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface IdeaDao {
    @Query("SELECT * FROM ideas WHERE deletedAt IS NULL AND archivedAt IS NULL ORDER BY createdAt DESC")
    fun getActiveIdeasFlow(): Flow<List<IdeaEntity>>

    @Query("SELECT * FROM ideas WHERE deletedAt IS NULL AND archivedAt IS NOT NULL ORDER BY archivedAt DESC")
    fun getArchivedIdeasFlow(): Flow<List<IdeaEntity>>

    @Query("SELECT * FROM ideas WHERE deletedAt IS NULL ORDER BY createdAt DESC")
    fun getAllIdeasFlow(): Flow<List<IdeaEntity>>

    @Query("SELECT * FROM ideas WHERE id = :id LIMIT 1")
    suspend fun getIdeaById(id: String): IdeaEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertIdea(idea: IdeaEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertIdeas(ideas: List<IdeaEntity>)

    @Update
    suspend fun updateIdea(idea: IdeaEntity)

    @Query("UPDATE ideas SET archivedAt = :archivedAt, updatedAt = :updatedAt WHERE id = :id")
    suspend fun setArchivedStatus(id: String, archivedAt: String?, updatedAt: String)

    @Query("UPDATE ideas SET deletedAt = :deletedAt, updatedAt = :deletedAt WHERE id = :id")
    suspend fun softDeleteIdea(id: String, deletedAt: String)

    @Query("DELETE FROM ideas WHERE id = :id")
    suspend fun hardDeleteIdea(id: String)
}
