// Quick debug script to check archived data
// Open browser console and run this to see what's in the archived days

console.log('=== DEBUG: Archived Days State ===');

// Get the TimeTracking context from the window
const timeTrackingContext = window.timeTrackingContext;

if (timeTrackingContext && timeTrackingContext.archivedDays) {
  const archivedDays = timeTrackingContext.archivedDays;

  console.log('Total archived days:', archivedDays.length);

  archivedDays.forEach((day, index) => {
    console.log(`\n--- Day ${index + 1} ---`);
    console.log('ID:', day.id);
    console.log('Date:', day.date);
    console.log('Tasks count:', day.tasks.length);
    console.log('Total duration:', day.totalDuration);

    if (day.tasks.length > 0) {
      console.log('Tasks:');
      day.tasks.forEach((task, taskIndex) => {
        console.log(`  ${taskIndex + 1}. ${task.title} (${task.duration}ms)`);
      });
    } else {
      console.log('⚠️ NO TASKS FOUND FOR THIS DAY!');
    }
  });
} else {
  console.log('❌ No archived days data found or context not available');
}
