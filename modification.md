# Modification Backlog

## 1-on-1 Agenda Template - Known Issues & Planned Improvements

### ✅ Applied

- **Assignee field is directly clickable** - each cell now has independent edit state; clicking assignee opens its own dropdown without needing row edit mode
- **Assignee dropdown with current user** - shows current user's avatar, name, email as a quick-assign option; also accepts custom text input
- **Show assignee email** - displayed alongside name in the dropdown and (on xl screens) in the row
- **Completed task row dimming** - entire row dims to opacity-50 when task is completed
- **Empty state per section** - "No tasks yet" shown when a section is expanded but has no tasks
- **Minutes column** - each task has a minutes field; per-section SUM shown at bottom when minutes > 0
- **Incomplete tasks filter toggle** - toolbar button to hide completed tasks
- **Sort button** - sort by Default / Priority / Due date via dropdown
- **Add task toolbar button** - quick "+ Add task" button in the top toolbar
- **Due date cell directly clickable** - clicking due date opens date picker without entering row edit mode

### 🔜 Pending (need schema or larger effort)

- **Participant profile pictures in header** - need `meetingParticipants` table; currently shows current user only
- **Meeting participants / invitees** - no schema for a second person in a 1:1 yet
- **Real multi-user assignee dropdown** - show all team members; requires meetingParticipants or teams integration
- **Navigation tabs** - Overview / Board / Timeline / Calendar / Dashboard / Workflow tabs (List is current view)
- **Board view** - Kanban-style columns per section
- **Share button in agenda header** - surface existing share functionality here too
- **Star / favourite meeting** - star icon on meeting
- **1:1 title format** - "Person A / Person B 1:1" using participant names
- **Drag to reorder tasks** - drag handle on hover
- **Drag to reorder sections** - drag sections up/down
- **Priority sort within section** - one-click sort button per section
