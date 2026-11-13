package com.planner.android.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.planner.android.data.models.LearningResourceEntity
import com.planner.android.ui.viewmodels.LearningViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LearningScreen(
    viewModel: LearningViewModel,
    showAddDialog: Boolean = false,
    onDismissAddDialog: () -> Unit = {}
) {
    val resources by viewModel.resources.collectAsState()
    val activeCount by viewModel.activeCount.collectAsState()
    val context = LocalContext.current

    var internalShowAddDialog by remember { mutableStateOf(false) }
    val isAddDialogVisible = showAddDialog || internalShowAddDialog

    val completedCount = resources.count { it.progressPercent >= 100 }
    val avgProgress = if (resources.isNotEmpty()) resources.sumOf { it.progressPercent } / resources.size else 0

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
            Spacer(modifier = Modifier.height(2.dp))

            // 1. Editorial Header (Things 3 style)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 6.dp, bottom = 2.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "LEARNING",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF10B981),
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Courses",
                        fontSize = 26.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onBackground,
                        letterSpacing = (-0.5).sp
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "$activeCount active · $completedCount completed · $avgProgress% avg",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f)
                    )
                }
            }

            // 2. Resources List or Empty State
            if (resources.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                        modifier = Modifier.padding(24.dp)
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = Color(0xFF10B981).copy(alpha = 0.12f),
                            modifier = Modifier.size(54.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.MenuBook,
                                    contentDescription = null,
                                    modifier = Modifier.size(28.dp),
                                    tint = Color(0xFF10B981)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "No learning resources yet",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Track books, tutorials, and online courses.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        FilledTonalButton(
                            onClick = { internalShowAddDialog = true },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Add your first course")
                        }
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(resources, key = { it.id }) { resource ->
                        LearningCardItem(
                            resource = resource,
                            onUpdateProgress = { newProgress -> viewModel.updateProgress(resource.id, newProgress) },
                            onDelete = { viewModel.deleteResource(resource.id) },
                            onOpenUrl = { url ->
                                try {
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                    context.startActivity(intent)
                                } catch (_: Exception) {
                                }
                            }
                        )
                    }
                    item {
                        Spacer(modifier = Modifier.height(84.dp)) // Padding for bottom bar & FAB
                    }
                }
            }
        }

        if (isAddDialogVisible) {
            AddCourseDialog(
                onDismiss = {
                    internalShowAddDialog = false
                    onDismissAddDialog()
                },
                onConfirm = { title, url, provider ->
                    viewModel.createResource(title, url, provider)
                    internalShowAddDialog = false
                    onDismissAddDialog()
                }
            )
        }
    }

@Composable
fun LearningCardItem(
    resource: LearningResourceEntity,
    onUpdateProgress: (Int) -> Unit,
    onDelete: () -> Unit,
    onOpenUrl: (String) -> Unit
) {
    val isFinished = resource.progressPercent >= 100

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = resource.title,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Surface(
                            color = Color(0xFF10B981).copy(alpha = 0.12f),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = resource.provider?.uppercase() ?: "COURSE",
                                color = Color(0xFF10B981),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }

                        if (!resource.url.isNullOrBlank()) {
                            Surface(
                                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                shape = RoundedCornerShape(6.dp),
                                modifier = Modifier.clickable { onOpenUrl(resource.url) }
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Icon(
                                        Icons.Default.OpenInNew,
                                        contentDescription = "Open Link",
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(11.dp)
                                    )
                                    Spacer(modifier = Modifier.width(3.dp))
                                    Text(
                                        text = "Open Link",
                                        color = MaterialTheme.colorScheme.primary,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                        }
                    }
                }

                IconButton(onClick = onDelete, modifier = Modifier.size(28.dp)) {
                    Icon(
                        Icons.Default.DeleteOutline,
                        contentDescription = "Delete",
                        tint = Color(0xFFEF4444).copy(alpha = 0.6f),
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Progress Bar & Percentage
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                LinearProgressIndicator(
                    progress = { resource.progressPercent / 100f },
                    modifier = Modifier
                        .weight(1f)
                        .height(7.dp)
                        .clip(RoundedCornerShape(4.dp)),
                    color = if (isFinished) Color(0xFF10B981) else MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                )
                Text(
                    text = "${resource.progressPercent}%",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = if (isFinished) Color(0xFF10B981) else MaterialTheme.colorScheme.onSurface
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Quick Progress Buttons (-10%, +10%, Complete)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Adjust: ",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                )
                FilledTonalButton(
                    onClick = { onUpdateProgress(resource.progressPercent - 10) },
                    enabled = resource.progressPercent > 0,
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.height(28.dp)
                ) {
                    Text("-10%", fontSize = 11.sp)
                }
                Spacer(modifier = Modifier.width(6.dp))
                FilledTonalButton(
                    onClick = { onUpdateProgress(resource.progressPercent + 10) },
                    enabled = resource.progressPercent < 100,
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.height(28.dp)
                ) {
                    Text("+10%", fontSize = 11.sp)
                }
                if (!isFinished) {
                    Spacer(modifier = Modifier.width(6.dp))
                    Button(
                        onClick = { onUpdateProgress(100) },
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                        modifier = Modifier.height(28.dp)
                    ) {
                        Text("Done", fontSize = 11.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun AddCourseDialog(
    onDismiss: () -> Unit,
    onConfirm: (String, String?, String?) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var url by remember { mutableStateOf("") }
    var provider by remember { mutableStateOf("Coursera") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                "Add Learning Resource",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    placeholder = { Text("Course / Book Title *", fontSize = 13.sp) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it },
                    placeholder = { Text("Resource URL (optional)", fontSize = 12.sp) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Text("Provider / Type:", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                val providers = listOf("Coursera", "Udemy", "YouTube", "Book", "Docs", "Other")
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        providers.take(3).forEach { p ->
                            FilterChip(
                                selected = provider == p,
                                onClick = { provider = p },
                                label = { Text(p, fontSize = 11.sp) },
                                shape = RoundedCornerShape(8.dp)
                            )
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        providers.drop(3).forEach { p ->
                            FilterChip(
                                selected = provider == p,
                                onClick = { provider = p },
                                label = { Text(p, fontSize = 11.sp) },
                                shape = RoundedCornerShape(8.dp)
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (title.isNotBlank()) {
                        onConfirm(title.trim(), url.ifBlank { null }, provider)
                    }
                },
                enabled = title.isNotBlank(),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text("Add Course")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        },
        shape = RoundedCornerShape(18.dp)
    )
}
