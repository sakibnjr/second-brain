package com.planner.android.data.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.planner.android.data.Converters
import com.planner.android.data.dao.IdeaDao
import com.planner.android.data.dao.LearningDao
import com.planner.android.data.dao.MutationQueueDao
import com.planner.android.data.dao.TaskDao
import com.planner.android.data.models.*

@Database(
    entities = [
        TaskEntity::class,
        IdeaEntity::class,
        LearningResourceEntity::class,
        StudySessionEntity::class,
        ReminderEntity::class,
        MutationQueueEntity::class
    ],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun taskDao(): TaskDao
    abstract fun ideaDao(): IdeaDao
    abstract fun learningDao(): LearningDao
    abstract fun mutationQueueDao(): MutationQueueDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "second_brain.db"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
