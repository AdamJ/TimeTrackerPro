// Enhanced localStorage Recovery Check
// Copy and paste this entire script into the browser console

console.log("🔍 TimeTrackerPro Enhanced Data Recovery");
console.log("========================================");

// First, let's see ALL localStorage keys
console.log("\n🗂️  ALL LOCALSTORAGE KEYS:");
console.log("========================");
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    console.log(`${key}: ${value ? value.length + ' chars' : 'null'}`);
}

// Check each possible TimeTracker key
const keysToCheck = [
    'archivedDays',
    'tasks',
    'projects',
    'categories',
    'timeTrackerData',
    'timeTracker_archivedDays',
    'timeTracker_tasks',
    'user_data',
    'archived_tasks'
];

console.log("\n📊 TIMETRACKER-SPECIFIC DATA:");
console.log("=============================");

keysToCheck.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
        try {
            const parsed = JSON.parse(data);
            console.log(`✅ ${key}:`);
            if (Array.isArray(parsed)) {
                console.log(`   📋 Array with ${parsed.length} items`);
                if (key === 'archivedDays' && parsed.length > 0) {
                    parsed.forEach((day, i) => {
                        console.log(`   Day ${i+1}: ${day.date} - ${day.tasks?.length || 0} tasks`);
                        if (day.tasks && day.tasks.length > 0) {
                            day.tasks.forEach((task, j) => {
                                console.log(`     📌 ${task.title} (${Math.round(task.duration/1000)}s)`);
                            });
                        }
                    });
                }
            } else if (typeof parsed === 'object') {
                console.log(`   📦 Object with keys: ${Object.keys(parsed).join(', ')}`);
            } else {
                console.log(`   📄 Value: ${parsed}`);
            }
        } catch (e) {
            console.log(`❌ ${key}: Invalid JSON - ${data.substring(0, 100)}...`);
        }
    } else {
        console.log(`❌ ${key}: Not found`);
    }
});

// Check if app is using Supabase and what the auth state is
console.log("\n🔐 AUTH & SUPABASE STATUS:");
console.log("=========================");
try {
    // Check if supabase client exists
    if (window.supabase || window._supabaseClient) {
        console.log("✅ Supabase client detected");
    } else {
        console.log("❌ No Supabase client found");
    }

    // Check auth state from various possible locations
    const authKeys = ['supabase.auth.token', 'sb-auth-token', 'auth', 'user'];
    authKeys.forEach(key => {
        const authData = localStorage.getItem(key);
        if (authData) {
            console.log(`✅ Auth data found in ${key}`);
        }
    });
} catch (e) {
    console.log("❌ Error checking auth:", e.message);
}

console.log("\n📈 SUMMARY:");
console.log("===========");
console.log("If you see any archivedDays with tasks above, those might be recoverable!");
console.log("If localStorage is completely empty, the missing data was likely lost during archiving.");

// Save results to window for inspection
window.localStorageData = {};
keysToCheck.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
        try {
            window.localStorageData[key] = JSON.parse(data);
        } catch (e) {
            window.localStorageData[key] = data;
        }
    }
});

console.log("\n💾 Data saved to window.localStorageData for inspection");
