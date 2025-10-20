# Archiving Days

When archiving a day's work, the following should be visible in the browser console:

```txt
📦 Archiving day: {id: "...", date: "...", tasksCount: 3, totalDuration: ...}
💾 Saving archived data to database...
📁 SupabaseService: Saving archived days... 1
👤 User authenticated: 2f1a6b79-26f5-4d47-855e-64f0ce004c48
🔄 Prepared data - Days: 1 Tasks: 3
🗑️ Clearing existing archived data...
✅ Existing archived data cleared
📅 Inserting archived days...
✅ Archived days saved
📝 Inserting archived tasks... 3
📋 Sample task data: {id: "...", user_id: "...", day_record_id: "...", title: "..."}
✅ Archived tasks saved: 3
🔍 Verifying archived data was saved correctly...
📊 Archive verification results: {expectedDays: 8, savedDays: 8, expectedTasks: 6, savedTasks: 6}
✅ Archive verification passed
🎉 All archived data saved successfully
✅ Archive saved successfully
```
