// CSV Import Test Script
// This script tests the CSV import functionality with our sample data

const testCSVContent = `id,user_id,title,description,start_time,end_time,duration,project_id,project_name,client,category_id,category_name,day_record_id,is_current,inserted_at,updated_at
"task-001","test-user-id","Example Task","Task description","2025-10-12T09:00:00.000Z","2025-10-12T10:30:00.000Z",5400000,"proj-001","Web Development","Acme Corp","cat-001","Development","day-001",false,"2025-10-12T10:30:00.000Z","2025-10-12T10:30:00.000Z"
"task-002","test-user-id","Another Task","Another task description","2025-10-12T11:00:00.000Z","2025-10-12T12:00:00.000Z",3600000,"proj-002","Marketing","Acme Corp","cat-002","Marketing","day-001",false,"2025-10-12T12:00:00.000Z","2025-10-12T12:00:00.000Z"`;

// Test function to validate CSV parsing logic
function testCSVParsing() {
  console.log('🧪 Testing CSV Import Functionality...\n');

  const lines = testCSVContent.split('\n').filter((line) => line.trim());
  console.log(`📄 Found ${lines.length} lines (including header)`);

  if (lines.length === 0) {
    console.error('❌ CSV file is empty');
    return false;
  }

  const headerLine = lines[0];
  const expectedHeaders = [
    'id',
    'user_id',
    'title',
    'description',
    'start_time',
    'end_time',
    'duration',
    'project_id',
    'project_name',
    'client',
    'category_id',
    'category_name',
    'day_record_id',
    'is_current',
    'inserted_at',
    'updated_at'
  ];

  // Validate headers
  const headers = headerLine.split(',').map((h) => h.trim().replace(/"/g, ''));
  console.log(`📋 Headers found: ${headers.join(', ')}`);

  const missingHeaders = expectedHeaders.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    console.error(
      `❌ CSV missing required headers: ${missingHeaders.join(', ')}`
    );
    return false;
  }
  console.log('✅ All required headers present');

  let importedCount = 0;
  let errors = [];

  // Process each data line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      console.log(`\n🔍 Processing line ${i + 1}: ${line.substring(0, 50)}...`);

      // Parse CSV line (handle quoted values)
      const values = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim()); // Add last value

      if (values.length !== headers.length) {
        const error = `Line ${i + 1}: expected ${headers.length} columns, got ${
          values.length
        }`;
        console.warn(`⚠️ ${error}`);
        errors.push(error);
        continue;
      }

      // Create task object from CSV data
      const taskData = {};
      headers.forEach((header, index) => {
        taskData[header] = values[index].replace(/^"|"$/g, ''); // Remove quotes
      });

      // Validate required fields
      if (!taskData.id || !taskData.title || !taskData.start_time) {
        const error = `Line ${
          i + 1
        }: missing required fields (id, title, or start_time)`;
        console.warn(`⚠️ ${error}`);
        errors.push(error);
        continue;
      }

      // Validate dates
      const startTime = new Date(taskData.start_time);
      if (isNaN(startTime.getTime())) {
        const error = `Line ${i + 1}: invalid start_time format`;
        console.warn(`⚠️ ${error}`);
        errors.push(error);
        continue;
      }

      const endTime = taskData.end_time ? new Date(taskData.end_time) : null;
      if (taskData.end_time && isNaN(endTime.getTime())) {
        const error = `Line ${i + 1}: invalid end_time format`;
        console.warn(`⚠️ ${error}`);
        errors.push(error);
        continue;
      }

      // Validate duration
      const duration = taskData.duration ? parseInt(taskData.duration) : null;
      if (taskData.duration && isNaN(duration)) {
        const error = `Line ${i + 1}: invalid duration format`;
        console.warn(`⚠️ ${error}`);
        errors.push(error);
        continue;
      }

      console.log(`✅ Line ${i + 1} parsed successfully:`);
      console.log(`📝 Task: ${taskData.title}`);
      console.log(`🕐 Start: ${taskData.start_time}`);
      console.log(`🕑 End: ${taskData.end_time || 'N/A'}`);
      console.log(
        `⏱️ Duration: ${duration ? duration / 60000 + ' minutes' : 'N/A'}`
      );
      console.log(`📁 Project: ${taskData.project_name || 'N/A'}`);
      console.log(`📋 Day ID: ${taskData.day_record_id}`);

      importedCount++;
    } catch (error) {
      const errorMsg = `Line ${i + 1}: parsing error - ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  // Summary
  console.log('\n📊 Import Test Results:');
  console.log(`✅ Successfully parsed: ${importedCount} tasks`);
  console.log(`❌ Errors encountered: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n🚨 Error Details:');
    errors.forEach((error) => console.log(`   - ${error}`));
  }

  return errors.length === 0;
}

// Export for use in browser console or test runner
if (typeof window !== 'undefined') {
  window.testCSVImport = testCSVParsing;
  console.log(
    '🔧 CSV import test function available as window.testCSVImport()'
  );
} else if (typeof module !== 'undefined') {
  module.exports = { testCSVParsing, testCSVContent };
}

// Auto-run if this script is executed directly
if (typeof window === 'undefined') {
  testCSVParsing();
}
