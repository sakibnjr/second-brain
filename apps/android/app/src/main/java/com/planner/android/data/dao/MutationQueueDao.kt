package com.planner.android.data.dao

import androidx.room.*
import com.planner.android.data.models.MutationQueueEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface MutationQueueDao {
    @Query("SELECT * FROM mutation_queue WHERE status = 'pending' ORDER BY clientTimestamp ASC")
    suspend fun getPendingMutations(): List<MutationQueueEntity>

    @Query("SELECT * FROM mutation_queue ORDER BY clientTimestamp DESC")
    fun getAllMutationsFlow(): Flow<List<MutationQueueEntity>>

    @Query("SELECT COUNT(*) FROM mutation_queue WHERE status = 'pending'")
    fun getPendingCountFlow(): Flow<Int>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMutation(mutation: MutationQueueEntity)

    @Query("UPDATE mutation_queue SET status = :status, retryCount = retryCount + 1, lastError = :error WHERE id = :id")
    suspend fun updateMutationStatus(id: String, status: String, error: String? = null)

    @Query("DELETE FROM mutation_queue WHERE id = :id")
    suspend fun deleteMutation(id: String)

    @Query("DELETE FROM mutation_queue WHERE status = 'synced'")
    suspend fun clearSynced()
}
