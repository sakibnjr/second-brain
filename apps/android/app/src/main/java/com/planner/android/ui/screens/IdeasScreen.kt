package com.planner.android.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.planner.android.data.models.IdeaEntity
import com.planner.android.ui.viewmodels.IdeaTab
import com.planner.android.ui.viewmodels.IdeaViewModel

@Composable
fun IdeasScreen(
    viewModel: IdeaViewModel,
    showAddDialog: Boolean = false,
    onDismissAddDialog: () -> Unit = {}
) {
    val ideas by viewModel.ideas.collectAsState()
    val currentTab by viewModel.currentTab.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()

    var internalShowAddDialog by remember { mutableStateOf(false) }
    val isAddDialogVisible = showAddDialog || internalShowAddDialog

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Spacer(modifier = Modifier.height(2.dp))

        // 1. Segmented Tab Selector (Editorial Minimalism)
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(4.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                listOf(
                    IdeaTab.ACTIVE to "Active Sparks",
                    IdeaTab.ARCHIVED to "Archived"
                ).forEach { (tab, label) ->
                    val isSelected = currentTab == tab
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .height(34.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .clickable { viewModel.setTab(tab) },
                        color = if (isSelected) MaterialTheme.colorScheme.surface else Color.Transparent,
                        shape = RoundedCornerShape(10.dp),
                        shadowElevation = if (isSelected) 1.dp else 0.dp
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = label,
                                fontSize = 12.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                        }
                    }
                }
            }
        }

        // 2. Search Bar (UX: Only visible when there are ideas to search or active query)
        if (ideas.isNotEmpty() || searchQuery.isNotEmpty()) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { viewModel.setSearchQuery(it) },
                placeholder = { Text("Search ideas...", fontSize = 13.sp) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                leadingIcon = {
                    Icon(
                        Icons.Default.Search,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { viewModel.setSearchQuery("") }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear", modifier = Modifier.size(16.dp))
                        }
                    }
                }
            )
        }

        // 3. Ideas List or Refined Empty State
        if (ideas.isEmpty()) {
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
                        color = Color(0xFFF59E0B).copy(alpha = 0.12f),
                        modifier = Modifier.size(58.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                if (currentTab == IdeaTab.ACTIVE) Icons.Default.Lightbulb else Icons.Default.Archive,
                                contentDescription = null,
                                modifier = Modifier.size(30.dp),
                                tint = Color(0xFFF59E0B)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(14.dp))
                    Text(
                        text = if (searchQuery.isNotEmpty()) "No matching ideas"
                        else if (currentTab == IdeaTab.ACTIVE) "No idea sparks yet"
                        else "No archived ideas",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = if (searchQuery.isNotEmpty()) "Try searching with a different term."
                        else if (currentTab == IdeaTab.ACTIVE) "Tap the (+) button below to capture thoughts, insights, or inspirations."
                        else "Archived ideas will appear here for safe keeping.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        lineHeight = 18.sp
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(ideas, key = { it.id }) { idea ->
                    IdeaCardItem(
                        idea = idea,
                        onToggleArchive = { viewModel.toggleArchive(idea) },
                        onDelete = { viewModel.deleteIdea(idea.id) }
                    )
                }
                item {
                    Spacer(modifier = Modifier.height(84.dp)) // Padding for bottom bar & FAB
                }
            }
        }
    }

    if (isAddDialogVisible) {
        AddIdeaDialog(
            onDismiss = {
                internalShowAddDialog = false
                onDismissAddDialog()
            },
            onConfirm = { title, content ->
                viewModel.createIdea(title, content)
                internalShowAddDialog = false
                onDismissAddDialog()
            }
        )
    }
}

@Composable
fun AddIdeaDialog(
    onDismiss: () -> Unit,
    onConfirm: (title: String, content: String) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var content by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Surface(
                    color = Color(0xFFF59E0B).copy(alpha = 0.15f),
                    shape = CircleShape,
                    modifier = Modifier.size(34.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            Icons.Default.Lightbulb,
                            contentDescription = null,
                            tint = Color(0xFFF59E0B),
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
                Column {
                    Text(
                        text = "Capture Idea Spark",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Store fleeting thoughts & notes",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }
        },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    placeholder = { Text("Core thought or insight *", fontSize = 13.sp) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = content,
                    onValueChange = { content = it },
                    placeholder = { Text("Add details, notes, links, or bullet points...", fontSize = 12.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    minLines = 3,
                    maxLines = 6
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (title.isNotBlank()) {
                        onConfirm(title.trim(), content.trim())
                    }
                },
                enabled = title.isNotBlank(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Save Spark", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@Composable
fun IdeaCardItem(
    idea: IdeaEntity,
    onToggleArchive: () -> Unit,
    onDelete: () -> Unit
) {
    val isArchived = idea.archivedAt != null

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
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        color = Color(0xFFF59E0B).copy(alpha = 0.14f),
                        shape = CircleShape,
                        modifier = Modifier.size(28.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                Icons.Default.Lightbulb,
                                contentDescription = null,
                                tint = Color(0xFFF59E0B),
                                modifier = Modifier.size(15.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = idea.title,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                    IconButton(
                        onClick = onToggleArchive,
                        modifier = Modifier.size(30.dp)
                    ) {
                        Icon(
                            if (isArchived) Icons.Default.Unarchive else Icons.Default.Archive,
                            contentDescription = if (isArchived) "Unarchive" else "Archive",
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    IconButton(
                        onClick = onDelete,
                        modifier = Modifier.size(30.dp)
                    ) {
                        Icon(
                            Icons.Default.DeleteOutline,
                            contentDescription = "Delete",
                            tint = Color(0xFFEF4444).copy(alpha = 0.6f),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
            if (idea.content.isNotBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = idea.content,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    lineHeight = 18.sp
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Captured ${idea.createdAt.take(10)}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.45f),
                fontSize = 10.sp
            )
        }
    }
}
