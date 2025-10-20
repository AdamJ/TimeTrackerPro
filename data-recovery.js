// TimeTrackerPro Data Recovery Script
// This script helps recover missing task data from archived days

console.log("🔍 TimeTrackerPro Data Recovery Tool");
console.log("===================================");

// Check localStorage for any archived data
function checkLocalStorageForArchivedData() {
    console.log("\n📱 Checking localStorage for archived data...");

    const archivedDays = localStorage.getItem('archivedDays');
    const projects = localStorage.getItem('projects');
    const categories = localStorage.getItem('categories');

    if (archivedDays) {
        console.log("✅ Found archivedDays in localStorage:");
        const parsedDays = JSON.parse(archivedDays);
        console.log(`   📊 ${parsedDays.length} archived days found`);

        // Check each day for tasks
        parsedDays.forEach((day, index) => {
            console.log(`   Day ${index + 1}: ${day.date} - ${day.tasks?.length || 0} tasks`);
            if (day.tasks && day.tasks.length > 0) {
                day.tasks.forEach((task, taskIndex) => {
                    console.log(`     Task ${taskIndex + 1}: ${task.title} (${task.duration}ms)`);
                });
            }
        });

        return parsedDays;
    } else {
        console.log("❌ No archivedDays found in localStorage");
        return [];
    }
}

// Check current tasks in localStorage
function checkCurrentTasks() {
    console.log("\n📋 Checking current tasks in localStorage...");

    const tasks = localStorage.getItem('tasks');
    if (tasks) {
        const parsedTasks = JSON.parse(tasks);
        console.log(`✅ Found ${parsedTasks.length} current tasks in localStorage`);
        return parsedTasks;
    } else {
        console.log("❌ No current tasks found in localStorage");
        return [];
    }
}

// Main recovery function
async function runDataRecovery() {
    console.log("🚀 Starting data recovery analysis...\n");

    // Check all localStorage data
    const archivedDays = checkLocalStorageForArchivedData();
    const currentTasks = checkCurrentTasks();

    // Summary
    console.log("\n📈 RECOVERY SUMMARY");
    console.log("==================");
    console.log(`Archived days in localStorage: ${archivedDays.length}`);
    console.log(`Current tasks in localStorage: ${currentTasks.length}`);

    const totalArchivedTasks = archivedDays.reduce((sum, day) => sum + (day.tasks?.length || 0), 0);
    console.log(`Total archived tasks in localStorage: ${totalArchivedTasks}`);

    if (totalArchivedTasks > 0) {
        console.log("\n🎯 POTENTIAL RECOVERY AVAILABLE!");
        console.log("Your localStorage contains archived tasks that might be missing from the database.");
        console.log("Consider running the migration tool to restore this data.");
    } else {
        console.log("\n❌ No additional archived tasks found in localStorage.");
        console.log("The missing tasks may have been lost during the archiving process.");
    }

    return {
        archivedDays,
        currentTasks,
        totalArchivedTasks
    };
}

// Auto-run when loaded
if (typeof window !== 'undefined') {
    // Running in browser
    runDataRecovery().then(result => {
        window.recoveryResult = result;
        console.log("\n💾 Results saved to window.recoveryResult");
    });
} else {
    // Running in Node.js
    console.log("This script should be run in the browser console.");
    console.log("Open your TimeTrackerPro app and paste this script into the console.");
}
