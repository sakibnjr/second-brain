package com.planner.android.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.planner.android.data.dao.MutationQueueDao
import com.planner.android.notifications.ReminderScheduler
import com.planner.android.sync.LocalAuthServer
import com.planner.android.sync.SupabaseClient
import com.planner.android.sync.SyncWorker
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen(
    supabaseClient: SupabaseClient,
    mutationQueueDao: MutationQueueDao
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val userProfile by supabaseClient.userProfile.collectAsState()
    val syncStatus by supabaseClient.syncStatus.collectAsState()

    var showEmailForm by remember { mutableStateOf(false) }
    var isSignUpMode by remember { mutableStateOf(false) }
    var emailInput by remember { mutableStateOf("") }
    var passwordInput by remember { mutableStateOf("") }
    var isAuthLoading by remember { mutableStateOf(false) }
    var authFeedback by remember { mutableStateOf<String?>(null) }
    var isAuthError by remember { mutableStateOf(false) }

    val isSyncing = syncStatus.state == "syncing"

    // Human-friendly status translation
    val userFriendlyStatus = when {
        isSyncing -> "Syncing your changes with cloud..."
        userProfile.isLoggedIn && syncStatus.state == "synced" -> "All your tasks & notes are up to date"
        userProfile.isLoggedIn -> "Connected to cloud vault"
        else -> "Changes are saved locally on your phone"
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 6.dp, bottom = 2.dp)
            ) {
                Text(
                    text = "PREFERENCES",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Settings",
                    fontSize = 26.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onBackground,
                    letterSpacing = (-0.5).sp
                )
            }
        }

        // 1. Account & Identity Section
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                            shape = CircleShape,
                            modifier = Modifier.size(46.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                if (userProfile.isLoggedIn && !userProfile.name.isNullOrBlank()) {
                                    Text(
                                        text = userProfile.name.take(1).uppercase(),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 18.sp,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                } else {
                                    Icon(
                                        Icons.Default.AccountCircle,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(26.dp)
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = if (userProfile.isLoggedIn) userProfile.name else "Local Vault",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = if (userProfile.isLoggedIn)
                                    (userProfile.email ?: "Active Account")
                                else
                                    "Sign in to sync across desktop and phone",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                        }

                        if (userProfile.isLoggedIn) {
                            Surface(
                                color = Color(0xFF10B981).copy(alpha = 0.14f),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(
                                    text = "CONNECTED",
                                    color = Color(0xFF10B981),
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }

                    if (authFeedback != null) {
                        Surface(
                            color = if (isAuthError) Color(0xFFEF4444).copy(alpha = 0.12f)
                            else Color(0xFF10B981).copy(alpha = 0.12f),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = authFeedback ?: "",
                                color = if (isAuthError) Color(0xFFEF4444) else Color(0xFF10B981),
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.padding(10.dp)
                            )
                        }
                    }

                    if (userProfile.isLoggedIn) {
                        OutlinedButton(
                            onClick = {
                                scope.launch {
                                    supabaseClient.signOut()
                                    authFeedback = "Signed out. Vault is currently in local mode."
                                    isAuthError = false
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.Logout, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Sign Out")
                        }
                    } else {
                        Button(
                            onClick = {
                                LocalAuthServer.start(context)
                                val url = supabaseClient.getGoogleOAuthUrl()
                                val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                                }
                                context.startActivity(browserIntent)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.Login, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Sign in with Google", fontWeight = FontWeight.Bold)
                        }

                        TextButton(
                            onClick = { showEmailForm = !showEmailForm },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = if (showEmailForm) "Hide email form" else "Or sign in with email & password",
                                fontSize = 12.sp
                            )
                        }

                        if (showEmailForm) {
                            HorizontalDivider(
                        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.25f),
                        thickness = 0.5.dp
                    )
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                FilterChip(
                                    selected = !isSignUpMode,
                                    onClick = { isSignUpMode = false },
                                    label = { Text("Sign In", fontSize = 12.sp) }
                                )
                                FilterChip(
                                    selected = isSignUpMode,
                                    onClick = { isSignUpMode = true },
                                    label = { Text("Create Account", fontSize = 12.sp) }
                                )
                            }

                            OutlinedTextField(
                                value = emailInput,
                                onValueChange = { emailInput = it },
                                label = { Text("Email address") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp)
                            )

                            OutlinedTextField(
                                value = passwordInput,
                                onValueChange = { passwordInput = it },
                                label = { Text("Password") },
                                singleLine = true,
                                visualTransformation = PasswordVisualTransformation(),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp)
                            )

                            Button(
                                onClick = {
                                    if (emailInput.isBlank() || passwordInput.isBlank()) return@Button
                                    isAuthLoading = true
                                    authFeedback = null
                                    scope.launch {
                                        val res = if (isSignUpMode) {
                                            supabaseClient.signUpWithEmail(emailInput, passwordInput)
                                        } else {
                                            supabaseClient.signInWithEmail(emailInput, passwordInput)
                                        }
                                        isAuthLoading = false
                                        res.onSuccess {
                                            authFeedback = "Signed in and synced with Supabase!"
                                            isAuthError = false
                                            passwordInput = ""
                                            SyncWorker.enqueueImmediateSync(context)
                                        }.onFailure { err ->
                                            authFeedback = err.message ?: "Authentication failed"
                                            isAuthError = true
                                        }
                                    }
                                },
                                enabled = !isAuthLoading && emailInput.isNotBlank() && passwordInput.isNotBlank(),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text(
                                    if (isAuthLoading) "Connecting..."
                                    else if (isSignUpMode) "Register & Sync"
                                    else "Sign In & Sync"
                                )
                            }
                        }
                    }
                }
            }
        }

        // 2. Cloud Sync Section
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            color = Color(0xFF10B981).copy(alpha = 0.14f),
                            shape = CircleShape,
                            modifier = Modifier.size(40.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.CloudSync,
                                    contentDescription = null,
                                    tint = Color(0xFF10B981),
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "Cloud Synchronization",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Continuous real-time replication",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                        }
                    }

                    HorizontalDivider(
                        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.25f),
                        thickness = 0.5.dp
                    )

                    // Clean user-friendly status banner
                    Surface(
                        color = when {
                            isSyncing -> Color(0xFFF59E0B).copy(alpha = 0.1f)
                            userProfile.isLoggedIn -> Color(0xFF10B981).copy(alpha = 0.1f)
                            else -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                        },
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                when {
                                    isSyncing -> Icons.Default.Sync
                                    userProfile.isLoggedIn -> Icons.Default.CheckCircle
                                    else -> Icons.Default.CloudQueue
                                },
                                contentDescription = null,
                                tint = when {
                                    isSyncing -> Color(0xFFF59E0B)
                                    userProfile.isLoggedIn -> Color(0xFF10B981)
                                    else -> Color.Gray
                                },
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = userFriendlyStatus,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = when {
                                    isSyncing -> Color(0xFFD97706)
                                    userProfile.isLoggedIn -> Color(0xFF059669)
                                    else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                }
                            )
                        }
                    }

                    Button(
                        onClick = {
                            scope.launch {
                                supabaseClient.syncNow()
                            }
                        },
                        enabled = !isSyncing,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(
                            Icons.Default.Sync,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isSyncing) "Syncing..." else "Sync Now",
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }

        // 3. Native Reminders & Notifications Section
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            color = Color(0xFF9333EA).copy(alpha = 0.14f),
                            shape = CircleShape,
                            modifier = Modifier.size(40.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.NotificationsActive,
                                    contentDescription = null,
                                    tint = Color(0xFF9333EA),
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Task Reminders & Alarms",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Receive exact alerts even if the app is closed",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                        }
                    }

                    val notificationsAllowed = remember { mutableStateOf(ReminderScheduler.hasNotificationPermission(context)) }
                    val exactAlarmsAllowed = remember { mutableStateOf(ReminderScheduler.canScheduleExactAlarms(context)) }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        val notifColor = if (notificationsAllowed.value) Color(0xFF10B981) else Color(0xFFEF4444)
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .clickable {
                                    if (!notificationsAllowed.value) {
                                        ReminderScheduler.openNotificationSettings(context)
                                    }
                                },
                            shape = RoundedCornerShape(10.dp),
                            color = notifColor.copy(alpha = 0.10f),
                            border = BorderStroke(1.dp, notifColor.copy(alpha = 0.25f))
                        ) {
                            Text(
                                text = if (notificationsAllowed.value) "Notifications: On" else "Notifications: Off (Tap)",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = notifColor,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp)
                            )
                        }

                        val alarmColor = if (exactAlarmsAllowed.value) Color(0xFF10B981) else Color(0xFFF59E0B)
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .clickable {
                                    if (!exactAlarmsAllowed.value) {
                                        ReminderScheduler.openExactAlarmSettings(context)
                                    }
                                },
                            shape = RoundedCornerShape(10.dp),
                            color = alarmColor.copy(alpha = 0.10f),
                            border = BorderStroke(1.dp, alarmColor.copy(alpha = 0.25f))
                        ) {
                            Text(
                                text = if (exactAlarmsAllowed.value) "Exact Alarms: On" else "Exact Alarms: Off (Tap)",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = alarmColor,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp)
                            )
                        }
                    }

                    OutlinedButton(
                        onClick = {
                            notificationsAllowed.value = ReminderScheduler.hasNotificationPermission(context)
                            exactAlarmsAllowed.value = ReminderScheduler.canScheduleExactAlarms(context)
                            if (!notificationsAllowed.value) {
                                ReminderScheduler.openNotificationSettings(context)
                            } else {
                                ReminderScheduler.showNotification(
                                    context = context,
                                    title = "🔔 Second Brain Reminder",
                                    body = "Native task reminders and alarms are active!"
                                )
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.Notifications, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Send Test Notification", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }

        // 4. About & Version
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "About Second Brain",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Second Brain helps you organize daily tasks, capture ideas, and track learning goals—offline-first and synced seamlessly across your devices.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                        lineHeight = 18.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Version 1.1.0",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.45f)
                    )
                }
            }
            Spacer(modifier = Modifier.height(84.dp))
        }
    }
}
