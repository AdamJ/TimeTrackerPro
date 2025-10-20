// EMERGENCY MIGRATION UTILITY
// Run this in browser console to force migrate localStorage data to Supabase

async function emergencyMigration() {
  console.log('🚨 Starting Emergency Migration...');

  // Check localStorage data
  const archivedDaysJson = localStorage.getItem('timetracker_archived_days');
  const projectsJson = localStorage.getItem('timetracker_projects');
  const categoriesJson = localStorage.getItem('timetracker_categories');

  console.log('📊 localStorage Data Found:');
  console.log('- Archived Days:', archivedDaysJson ? JSON.parse(archivedDaysJson).length : 0);
  console.log('- Projects:', projectsJson ? JSON.parse(projectsJson).length : 0);
  console.log('- Categories:', categoriesJson ? JSON.parse(categoriesJson).length : 0);

  if (archivedDaysJson) {
    const archivedDays = JSON.parse(archivedDaysJson);
    console.log('🔍 Sample Archived Day:', archivedDays[0]);

    if (archivedDays[0] && archivedDays[0].tasks) {
      console.log('✅ Archived days contain tasks:', archivedDays[0].tasks.length);
    } else {
      console.log('❌ Archived days missing tasks!');
    }
  }

  // Get the context to trigger manual sync
  const context = window.timeTrackingContext ||
                  (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED);

  if (context && context.forceSyncToDatabase) {
    console.log('🔄 Triggering force sync to database...');
    await context.forceSyncToDatabase();
    console.log('✅ Sync completed!');
  } else {
    console.log('❌ Cannot access sync function. Try manual migration:');
    console.log('1. Copy the localStorage data');
    console.log('2. Use the app export function');
    console.log('3. Clear Supabase data');
    console.log('4. Use the app import function');
  }
}

// Add to global scope for easy access
window.emergencyMigration = emergencyMigration;

console.log('🔧 Emergency migration utility loaded. Run: emergencyMigration()');
