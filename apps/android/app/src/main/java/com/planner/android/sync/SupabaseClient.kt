package com.planner.android.sync

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import com.planner.android.data.database.AppDatabase
import com.planner.android.data.models.IdeaEntity
import com.planner.android.data.models.LearningResourceEntity
import com.planner.android.data.models.StudySessionEntity
import com.planner.android.data.models.TaskEntity
import com.planner.android.notifications.ReminderScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

data class UserProfile(
    val userId: String? = null,
    val name: String = "Guest",
    val email: String? = null,
    val avatarUrl: String? = null,
    val isLoggedIn: Boolean = false
)

data class SyncStatus(
    val state: String = "idle", // idle, syncing, synced, offline, error
    val message: String = "Ready to sync",
    val lastSyncTime: String? = null
)

class SupabaseClient private constructor(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val syncMutex = Mutex()

    private val _userProfile = MutableStateFlow(loadStoredUserProfile())
    val userProfile: StateFlow<UserProfile> = _userProfile.asStateFlow()

    private val _syncStatus = MutableStateFlow(
        SyncStatus(
            state = if (loadStoredUserProfile().isLoggedIn) "idle" else "offline",
            message = if (loadStoredUserProfile().isLoggedIn) "Ready to replicate" else "Local guest mode",
            lastSyncTime = prefs.getString(KEY_LAST_SYNC, null)
        )
    )
    val syncStatus: StateFlow<SyncStatus> = _syncStatus.asStateFlow()

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    private fun loadStoredUserProfile(): UserProfile {
        val token = prefs.getString(KEY_ACCESS_TOKEN, null)
        val userId = prefs.getString(KEY_USER_ID, null)
        if (token.isNullOrBlank() || userId.isNullOrBlank()) {
            return UserProfile()
        }
        return UserProfile(
            userId = userId,
            name = prefs.getString(KEY_USER_NAME, "User") ?: "User",
            email = prefs.getString(KEY_USER_EMAIL, null),
            avatarUrl = prefs.getString(KEY_AVATAR_URL, null),
            isLoggedIn = true
        )
    }

    private fun saveSession(
        accessToken: String,
        refreshToken: String?,
        userObj: JSONObject
    ): UserProfile {
        val userId = userObj.optString("id")
        val email = userObj.optString("email", "")
        val meta = userObj.optJSONObject("user_metadata") ?: JSONObject()

        val name = meta.optString("full_name").ifBlank {
            meta.optString("name").ifBlank {
                if (email.contains("@")) email.substringBefore("@") else "User"
            }
        }
        val avatarUrl = meta.optString("avatar_url").ifBlank {
            meta.optString("picture").ifBlank { "" }
        }.ifBlank { null }

        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken ?: prefs.getString(KEY_REFRESH_TOKEN, null))
            .putString(KEY_USER_ID, userId)
            .putString(KEY_USER_EMAIL, email.ifBlank { null })
            .putString(KEY_USER_NAME, name)
            .putString(KEY_AVATAR_URL, avatarUrl)
            .apply()

        val profile = UserProfile(
            userId = userId,
            name = name,
            email = email.ifBlank { null },
            avatarUrl = avatarUrl,
            isLoggedIn = true
        )
        _userProfile.value = profile
        return profile
    }

    fun getGoogleOAuthUrl(): String {
        val redirectUri = URLEncoder.encode(OAUTH_REDIRECT_URI, "UTF-8")
        return "$SUPABASE_URL/auth/v1/authorize?provider=google&redirect_to=$redirectUri"
    }

    suspend fun handleOAuthCallback(uri: Uri): Result<UserProfile> = withContext(Dispatchers.IO) {
        try {
            // Check both fragment (#access_token=...) and query (?access_token=...)
            val fragment = uri.fragment ?: ""
            val params = mutableMapOf<String, String>()
            if (fragment.isNotEmpty()) {
                fragment.split("&").forEach { pair ->
                    val parts = pair.split("=", limit = 2)
                    if (parts.size == 2) {
                        params[parts[0]] = Uri.decode(parts[1])
                    }
                }
            }
            uri.queryParameterNames.forEach { key ->
                uri.getQueryParameter(key)?.let { params[key] = it }
            }

            var accessToken = params["access_token"]
            var refreshToken = params["refresh_token"]
            val code = params["code"]

            if (accessToken.isNullOrBlank() && !code.isNullOrBlank()) {
                val payload = JSONObject().apply {
                    put("auth_code", code)
                }
                val (tokenCode, tokenBody) = httpRequest(
                    urlStr = "$SUPABASE_URL/auth/v1/token?grant_type=pkce",
                    method = "POST",
                    body = payload.toString()
                )
                if (tokenCode in 200..299) {
                    val json = JSONObject(tokenBody)
                    accessToken = json.optString("access_token")
                    refreshToken = json.optString("refresh_token")
                }
            }

            if (accessToken.isNullOrBlank()) {
                return@withContext Result.failure(Exception("Missing access_token in OAuth redirect"))
            }

            val userRes = httpRequest(
                urlStr = "$SUPABASE_URL/auth/v1/user",
                method = "GET",
                accessToken = accessToken
            )
            if (userRes.first !in 200..299) {
                return@withContext Result.failure(Exception("Failed to fetch Google user profile"))
            }

            val userJson = JSONObject(userRes.second)
            val profile = saveSession(accessToken, refreshToken, userJson)
            syncNow()
            Result.success(profile)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun signInWithEmail(email: String, password: String): Result<UserProfile> =
        withContext(Dispatchers.IO) {
            try {
                val payload = JSONObject().apply {
                    put("email", email.trim())
                    put("password", password)
                }
                val (code, body) = httpRequest(
                    urlStr = "$SUPABASE_URL/auth/v1/token?grant_type=password",
                    method = "POST",
                    body = payload.toString()
                )
                if (code !in 200..299) {
                    val errMsg = parseErrorMessage(body, "Sign in failed (HTTP $code)")
                    return@withContext Result.failure(Exception(errMsg))
                }

                val json = JSONObject(body)
                val accessToken = json.getString("access_token")
                val refreshToken = json.optString("refresh_token", "")
                val userObj = json.getJSONObject("user")

                val profile = saveSession(accessToken, refreshToken, userObj)
                syncNow()
                Result.success(profile)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun signUpWithEmail(email: String, password: String): Result<UserProfile> =
        withContext(Dispatchers.IO) {
            try {
                val payload = JSONObject().apply {
                    put("email", email.trim())
                    put("password", password)
                }
                val (code, body) = httpRequest(
                    urlStr = "$SUPABASE_URL/auth/v1/signup",
                    method = "POST",
                    body = payload.toString()
                )
                if (code !in 200..299) {
                    val errMsg = parseErrorMessage(body, "Sign up failed (HTTP $code)")
                    return@withContext Result.failure(Exception(errMsg))
                }

                val json = JSONObject(body)
                val accessToken = json.optString("access_token", "")
                val refreshToken = json.optString("refresh_token", "")
                val userObj = json.optJSONObject("user") ?: json

                if (accessToken.isNotBlank()) {
                    val profile = saveSession(accessToken, refreshToken, userObj)
                    syncNow()
                    Result.success(profile)
                } else {
                    // If email confirmation is off or session requires immediate sign-in
                    signInWithEmail(email, password)
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun signOut() = withContext(Dispatchers.IO) {
        val token = prefs.getString(KEY_ACCESS_TOKEN, null)
        if (!token.isNullOrBlank()) {
            try {
                httpRequest(
                    urlStr = "$SUPABASE_URL/auth/v1/logout",
                    method = "POST",
                    accessToken = token
                )
            } catch (_: Exception) {
            }
        }
        prefs.edit()
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_REFRESH_TOKEN)
            .remove(KEY_USER_ID)
            .remove(KEY_USER_EMAIL)
            .remove(KEY_USER_NAME)
            .remove(KEY_AVATAR_URL)
            .apply()

        _userProfile.value = UserProfile()
        _syncStatus.value = SyncStatus(
            state = "offline",
            message = "Signed out (Local guest mode)",
            lastSyncTime = prefs.getString(KEY_LAST_SYNC, null)
        )
    }

    private fun refreshAccessToken(): String? {
        val refreshToken = prefs.getString(KEY_REFRESH_TOKEN, null) ?: return null
        return try {
            val payload = JSONObject().apply {
                put("refresh_token", refreshToken)
            }
            val (code, body) = httpRequest(
                urlStr = "$SUPABASE_URL/auth/v1/token?grant_type=refresh_token",
                method = "POST",
                body = payload.toString()
            )
            if (code in 200..299) {
                val json = JSONObject(body)
                val newAccess = json.getString("access_token")
                val newRefresh = json.optString("refresh_token", refreshToken)
                val userObj = json.optJSONObject("user")
                if (userObj != null) {
                    saveSession(newAccess, newRefresh, userObj)
                } else {
                    prefs.edit()
                        .putString(KEY_ACCESS_TOKEN, newAccess)
                        .putString(KEY_REFRESH_TOKEN, newRefresh)
                        .apply()
                }
                newAccess
            } else {
                null
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun isOnline(): Boolean {
        val cm = appContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    suspend fun syncNow(): Result<Unit> = withContext(Dispatchers.IO) {
        syncMutex.withLock {
            try {
                if (!isOnline()) {
                    _syncStatus.value = SyncStatus(
                        state = "offline",
                        message = "Device offline · Saved locally",
                        lastSyncTime = prefs.getString(KEY_LAST_SYNC, null)
                    )
                    return@withContext Result.failure(Exception("Offline"))
                }

                var accessToken = prefs.getString(KEY_ACCESS_TOKEN, null)
                val userId = prefs.getString(KEY_USER_ID, null)
                if (accessToken.isNullOrBlank() || userId.isNullOrBlank()) {
                    _syncStatus.value = SyncStatus(
                        state = "offline",
                        message = "Guest mode · Sign in to sync",
                        lastSyncTime = prefs.getString(KEY_LAST_SYNC, null)
                    )
                    return@withContext Result.failure(Exception("Not authenticated"))
                }

                _syncStatus.value = SyncStatus(
                    state = "syncing",
                    message = "Synchronizing with Supabase...",
                    lastSyncTime = prefs.getString(KEY_LAST_SYNC, null)
                )

                val db = AppDatabase.getDatabase(appContext)
                val mutationDao = db.mutationQueueDao()
                val taskDao = db.taskDao()
                val ideaDao = db.ideaDao()
                val learningDao = db.learningDao()

                // Verify or refresh token if needed
                val testUser = httpRequest("$SUPABASE_URL/auth/v1/user", "GET", accessToken = accessToken)
                if (testUser.first == 401) {
                    val refreshed = refreshAccessToken()
                    if (refreshed != null) {
                        accessToken = refreshed
                    } else {
                        _syncStatus.value = SyncStatus(
                            state = "error",
                            message = "Session expired · Please sign in again",
                            lastSyncTime = prefs.getString(KEY_LAST_SYNC, null)
                        )
                        return@withContext Result.failure(Exception("Session expired"))
                    }
                }

                // 1. Push pending mutations
                val pending = mutationDao.getPendingMutations()
                for (item in pending) {
                    try {
                        val payloadObj = buildFullPayloadForMutation(item.entityType, item.entityId, item.payloadJson, userId, db)
                        val tableName = when (item.entityType) {
                            "task" -> "tasks"
                            "idea" -> "ideas"
                            "learning_resource" -> "learning_resources"
                            "study_session" -> "study_sessions"
                            else -> null
                        }
                        if (tableName != null && payloadObj != null) {
                            val (code, errBody) = httpRequest(
                                urlStr = "$SUPABASE_URL/rest/v1/$tableName?on_conflict=id",
                                method = "POST",
                                body = payloadObj.toString(),
                                accessToken = accessToken,
                                extraHeaders = mapOf("Prefer" to "resolution=merge-duplicates,return=minimal")
                            )
                            if (code in 200..299) {
                                mutationDao.deleteMutation(item.id)
                            } else {
                                mutationDao.updateMutationStatus(item.id, "pending", "HTTP $code: $errBody")
                            }
                        } else {
                            mutationDao.deleteMutation(item.id)
                        }
                    } catch (e: Exception) {
                        mutationDao.updateMutationStatus(item.id, "pending", e.message)
                    }
                }

                // 2. Pull remote changes from Supabase
                val encodedUserId = URLEncoder.encode(userId, "UTF-8")

                // Pull Tasks
                val tasksRes = httpRequest(
                    urlStr = "$SUPABASE_URL/rest/v1/tasks?user_id=eq.$encodedUserId&select=*",
                    method = "GET",
                    accessToken = accessToken
                )
                if (tasksRes.first in 200..299) {
                    val arr = JSONArray(tasksRes.second)
                    val remoteTasks = mutableListOf<TaskEntity>()
                    for (i in 0 until arr.length()) {
                        val obj = arr.getJSONObject(i)
                        val entity = parseTaskEntity(obj)
                        remoteTasks.add(entity)
                    }
                    if (remoteTasks.isNotEmpty()) {
                        taskDao.insertTasks(remoteTasks)
                        remoteTasks.forEach { ReminderScheduler.scheduleTaskReminder(appContext, it) }
                    }
                }

                // Pull Ideas
                val ideasRes = httpRequest(
                    urlStr = "$SUPABASE_URL/rest/v1/ideas?user_id=eq.$encodedUserId&select=*",
                    method = "GET",
                    accessToken = accessToken
                )
                if (ideasRes.first in 200..299) {
                    val arr = JSONArray(ideasRes.second)
                    val remoteIdeas = mutableListOf<IdeaEntity>()
                    for (i in 0 until arr.length()) {
                        val obj = arr.getJSONObject(i)
                        remoteIdeas.add(parseIdeaEntity(obj))
                    }
                    if (remoteIdeas.isNotEmpty()) {
                        ideaDao.insertIdeas(remoteIdeas)
                    }
                }

                // Pull Learning Resources
                val learningRes = httpRequest(
                    urlStr = "$SUPABASE_URL/rest/v1/learning_resources?user_id=eq.$encodedUserId&select=*",
                    method = "GET",
                    accessToken = accessToken
                )
                if (learningRes.first in 200..299) {
                    val arr = JSONArray(learningRes.second)
                    val remoteResources = mutableListOf<LearningResourceEntity>()
                    for (i in 0 until arr.length()) {
                        val obj = arr.getJSONObject(i)
                        remoteResources.add(parseLearningEntity(obj))
                    }
                    if (remoteResources.isNotEmpty()) {
                        learningDao.insertResources(remoteResources)
                    }
                }

                // Pull Study Sessions
                val sessionsRes = httpRequest(
                    urlStr = "$SUPABASE_URL/rest/v1/study_sessions?user_id=eq.$encodedUserId&select=*",
                    method = "GET",
                    accessToken = accessToken
                )
                if (sessionsRes.first in 200..299) {
                    val arr = JSONArray(sessionsRes.second)
                    for (i in 0 until arr.length()) {
                        val obj = arr.getJSONObject(i)
                        learningDao.insertStudySession(parseStudySessionEntity(obj))
                    }
                }

                val nowIso = isoFormat.format(Date())
                val timeDisplay = SimpleDateFormat("hh:mm a", Locale.US).format(Date())
                prefs.edit().putString(KEY_LAST_SYNC, nowIso).apply()

                _syncStatus.value = SyncStatus(
                    state = "synced",
                    message = "Synced at $timeDisplay",
                    lastSyncTime = nowIso
                )
                Result.success(Unit)
            } catch (e: Exception) {
                _syncStatus.value = SyncStatus(
                    state = "error",
                    message = e.message ?: "Sync failed",
                    lastSyncTime = prefs.getString(KEY_LAST_SYNC, null)
                )
                Result.failure(e)
            }
        }
    }

    private suspend fun buildFullPayloadForMutation(
        entityType: String,
        entityId: String,
        fallbackJson: String,
        userId: String,
        db: AppDatabase
    ): JSONObject? {
        return when (entityType) {
            "task" -> {
                val t = db.taskDao().getTaskById(entityId)
                if (t != null) {
                    JSONObject().apply {
                        put("id", t.id)
                        put("user_id", userId)
                        put("title", t.title)
                        put("description", t.description ?: JSONObject.NULL)
                        put("status", t.status)
                        put("priority", t.priority)
                        put("due_at", t.dueAt ?: JSONObject.NULL)
                        put("reminder_at", t.reminderAt ?: JSONObject.NULL)
                        put("tags", JSONArray(t.tags))
                        put("created_at", t.createdAt)
                        put("updated_at", t.updatedAt)
                        put("deleted_at", t.deletedAt ?: JSONObject.NULL)
                        put("version", t.version)
                    }
                } else {
                    JSONObject(fallbackJson).apply { put("user_id", userId) }
                }
            }
            "idea" -> {
                val i = db.ideaDao().getIdeaById(entityId)
                if (i != null) {
                    JSONObject().apply {
                        put("id", i.id)
                        put("user_id", userId)
                        put("title", i.title)
                        put("content", i.content)
                        put("archived_at", i.archivedAt ?: JSONObject.NULL)
                        put("tags", JSONArray(i.tags))
                        put("created_at", i.createdAt)
                        put("updated_at", i.updatedAt)
                        put("deleted_at", i.deletedAt ?: JSONObject.NULL)
                        put("version", i.version)
                    }
                } else {
                    JSONObject(fallbackJson).apply { put("user_id", userId) }
                }
            }
            "learning_resource" -> {
                val r = db.learningDao().getResourceById(entityId)
                if (r != null) {
                    JSONObject().apply {
                        put("id", r.id)
                        put("user_id", userId)
                        put("title", r.title)
                        put("url", r.url ?: JSONObject.NULL)
                        put("provider", r.provider ?: JSONObject.NULL)
                        put("status", r.status)
                        put("progress_percent", r.progressPercent)
                        put("notes", r.notes ?: JSONObject.NULL)
                        put("created_at", r.createdAt)
                        put("updated_at", r.updatedAt)
                        put("deleted_at", r.deletedAt ?: JSONObject.NULL)
                        put("version", r.version)
                    }
                } else {
                    JSONObject(fallbackJson).apply { put("user_id", userId) }
                }
            }
            else -> JSONObject(fallbackJson).apply { put("user_id", userId) }
        }
    }

    private fun parseTaskEntity(obj: JSONObject): TaskEntity {
        val tagsArr = obj.optJSONArray("tags")
        val tags = mutableListOf<String>()
        if (tagsArr != null) {
            for (i in 0 until tagsArr.length()) {
                tags.add(tagsArr.optString(i))
            }
        }
        return TaskEntity(
            id = obj.getString("id"),
            userId = obj.optString("user_id").ifBlank { null },
            title = obj.optString("title", "Untitled"),
            description = if (obj.isNull("description")) null else obj.optString("description"),
            status = obj.optString("status", "todo"),
            priority = obj.optString("priority", "medium"),
            dueAt = if (obj.isNull("due_at")) null else obj.optString("due_at"),
            reminderAt = if (obj.isNull("reminder_at")) null else obj.optString("reminder_at"),
            tags = tags,
            createdAt = obj.optString("created_at", isoFormat.format(Date())),
            updatedAt = obj.optString("updated_at", isoFormat.format(Date())),
            deletedAt = if (obj.isNull("deleted_at")) null else obj.optString("deleted_at"),
            version = obj.optLong("version", 1L)
        )
    }

    private fun parseIdeaEntity(obj: JSONObject): IdeaEntity {
        val tagsArr = obj.optJSONArray("tags")
        val tags = mutableListOf<String>()
        if (tagsArr != null) {
            for (i in 0 until tagsArr.length()) {
                tags.add(tagsArr.optString(i))
            }
        }
        return IdeaEntity(
            id = obj.getString("id"),
            userId = obj.optString("user_id").ifBlank { null },
            title = obj.optString("title", "Untitled"),
            content = if (obj.isNull("content")) "" else obj.optString("content", ""),
            archivedAt = if (obj.isNull("archived_at")) null else obj.optString("archived_at"),
            tags = tags,
            createdAt = obj.optString("created_at", isoFormat.format(Date())),
            updatedAt = obj.optString("updated_at", isoFormat.format(Date())),
            deletedAt = if (obj.isNull("deleted_at")) null else obj.optString("deleted_at"),
            version = obj.optLong("version", 1L)
        )
    }

    private fun parseLearningEntity(obj: JSONObject): LearningResourceEntity {
        return LearningResourceEntity(
            id = obj.getString("id"),
            userId = obj.optString("user_id").ifBlank { null },
            title = obj.optString("title", "Untitled"),
            url = if (obj.isNull("url")) null else obj.optString("url"),
            provider = if (obj.isNull("provider")) null else obj.optString("provider"),
            status = obj.optString("status", "planned"),
            progressPercent = obj.optInt("progress_percent", 0),
            notes = if (obj.isNull("notes")) null else obj.optString("notes"),
            createdAt = obj.optString("created_at", isoFormat.format(Date())),
            updatedAt = obj.optString("updated_at", isoFormat.format(Date())),
            deletedAt = if (obj.isNull("deleted_at")) null else obj.optString("deleted_at"),
            version = obj.optLong("version", 1L)
        )
    }

    private fun parseStudySessionEntity(obj: JSONObject): StudySessionEntity {
        return StudySessionEntity(
            id = obj.getString("id"),
            userId = obj.optString("user_id").ifBlank { null },
            resourceId = obj.getString("resource_id"),
            startedAt = obj.optString("started_at", isoFormat.format(Date())),
            durationMinutes = obj.optInt("duration_minutes", 15),
            notes = if (obj.isNull("notes")) null else obj.optString("notes"),
            createdAt = obj.optString("created_at", isoFormat.format(Date())),
            updatedAt = obj.optString("updated_at", isoFormat.format(Date())),
            deletedAt = if (obj.isNull("deleted_at")) null else obj.optString("deleted_at"),
            version = obj.optLong("version", 1L)
        )
    }

    private fun parseErrorMessage(body: String, fallback: String): String {
        return try {
            val obj = JSONObject(body)
            obj.optString("error_description")
                .ifBlank { obj.optString("msg") }
                .ifBlank { obj.optString("message") }
                .ifBlank { fallback }
        } catch (_: Exception) {
            fallback
        }
    }

    private fun httpRequest(
        urlStr: String,
        method: String,
        body: String? = null,
        accessToken: String? = null,
        extraHeaders: Map<String, String> = emptyMap()
    ): Pair<Int, String> {
        val url = URL(urlStr)
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 15000
            readTimeout = 15000
            setRequestProperty("apikey", SUPABASE_ANON_KEY)
            setRequestProperty("Content-Type", "application/json")
            if (!accessToken.isNullOrBlank()) {
                setRequestProperty("Authorization", "Bearer $accessToken")
            } else {
                setRequestProperty("Authorization", "Bearer $SUPABASE_ANON_KEY")
            }
            for ((k, v) in extraHeaders) {
                setRequestProperty(k, v)
            }
            if (body != null && (method == "POST" || method == "PUT" || method == "PATCH")) {
                doOutput = true
            }
        }

        if (body != null && (method == "POST" || method == "PUT" || method == "PATCH")) {
            OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { writer ->
                writer.write(body)
                writer.flush()
            }
        }

        val responseCode = conn.responseCode
        val stream = if (responseCode in 200..299) conn.inputStream else conn.errorStream
        val responseBody = if (stream != null) {
            BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).use { it.readText() }
        } else {
            ""
        }
        conn.disconnect()
        return responseCode to responseBody
    }

    companion object {
        const val SUPABASE_URL = "https://ipfczdqmbjaiwfrdxupl.supabase.co"
        const val SUPABASE_ANON_KEY =
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwZmN6ZHFtYmphaXdmcmR4dXBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNTQ0NzksImV4cCI6MjEwODkzMDQ3OX0.LE72vH9ho-XvCARYZCvCTRhMoef9qhzAqlxDElv1cNw"
        const val OAUTH_REDIRECT_URI = "secondbrain://auth-callback"

        private const val PREFS_NAME = "second_brain_sync_prefs"
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_EMAIL = "user_email"
        private const val KEY_USER_NAME = "user_name"
        private const val KEY_AVATAR_URL = "avatar_url"
        private const val KEY_LAST_SYNC = "last_sync_time"

        @Volatile
        private var INSTANCE: SupabaseClient? = null

        fun getInstance(context: Context): SupabaseClient {
            return INSTANCE ?: synchronized(this) {
                val instance = SupabaseClient(context.applicationContext)
                INSTANCE = instance
                instance
            }
        }
    }
}
