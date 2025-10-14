// Full Import Process Test
// This simulates what happens when a user uploads the CSV template

async function testFullImportProcess() {
  console.log('🧪 Testing Full CSV Import Process...\n');

  // Read the actual template file content
  const csvContent = `id,user_id,title,description,start_time,end_time,duration,project_id,project_name,client,category_id,category_name,day_record_id,is_current,inserted_at,updated_at
"task-001","","Example Task","Task description","2025-10-12T09:00:00.000Z","2025-10-12T10:30:00.000Z",5400000,"proj-001","Web Development","Acme Corp","cat-001","Development","day-001",false,"2025-10-12T10:30:00.000Z","2025-10-12T10:30:00.000Z"
"task-002","","Another Task","Another task description","2025-10-12T11:00:00.000Z","2025-10-12T12:00:00.000Z",3600000,"proj-002","Marketing","Acme Corp","cat-002","Marketing","day-001",false,"2025-10-12T12:00:00.000Z","2025-10-12T12:00:00.000Z"`;

  console.log('📄 CSV Content to Import:');
  console.log(csvContent);
  console.log('\n' + '='.repeat(80) + '\n');

  // Simulate the import function logic
  try {
    const lines = csvContent.split('\n').filter((line) => line.trim());
    if (lines.length === 0) {
      return { success: false, message: 'CSV file is empty', importedCount: 0 };
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
    console.log('🔍 Validating Headers...');
    const headers = headerLine
      .split(',')
      .map((h) => h.trim().replace(/"/g, ''));
    const missingHeaders = expectedHeaders.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      const error = `CSV missing required headers: ${missingHeaders.join(
        ', '
      )}`;
      console.error(`❌ ${error}`);
      return { success: false, message: error, importedCount: 0 };
    }
    console.log('✅ All headers validated successfully');

    const tasksByDay = {};
    let importedCount = 0;

    // Process each data line
    console.log('\n🔄 Processing Data Lines...');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        console.log(`\n📋 Processing Line ${i}: ${line.substring(0, 60)}...`);

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
        values.push(current.trim());

        if (values.length !== headers.length) {
          console.warn(
            `⚠️ Skipping malformed CSV line ${i + 1}: expected ${
              headers.length
            } columns, got ${values.length}`
          );
          continue;
        }

        // Create task object from CSV data
        const taskData = {};
        headers.forEach((header, index) => {
          taskData[header] = values[index].replace(/^"|"$/g, '');
        });

        // Validate required fields
        if (!taskData.id || !taskData.title || !taskData.start_time) {
          console.warn(
            `⚠️ Skipping incomplete task on line ${
              i + 1
            }: missing required fields`
          );
          continue;
        }

        const task = {
          id: taskData.id,
          title: taskData.title,
          description: taskData.description || undefined,
          startTime: new Date(taskData.start_time),
          endTime: taskData.end_time ? new Date(taskData.end_time) : undefined,
          duration: taskData.duration ? parseInt(taskData.duration) : undefined,
          project: taskData.project_name || undefined,
          client: taskData.client || undefined,
          category: taskData.category_name || undefined
        };

        // Validate dates
        if (isNaN(task.startTime.getTime())) {
          console.warn(
            `⚠️ Skipping task with invalid start_time on line ${i + 1}`
          );
          continue;
        }

        if (task.endTime && isNaN(task.endTime.getTime())) {
          task.endTime = undefined;
        }

        const dayRecordId = taskData.day_record_id;
        if (!dayRecordId) {
          console.warn(
            `⚠️ Skipping task without day_record_id on line ${i + 1}`
          );
          continue;
        }

        // Group tasks by day
        if (!tasksByDay[dayRecordId]) {
          tasksByDay[dayRecordId] = {
            tasks: [],
            dayRecord: {
              id: dayRecordId,
              date: task.startTime.toISOString().split('T')[0],
              startTime: task.startTime,
              endTime: task.endTime || task.startTime,
              totalDuration: 0,
              tasks: []
            }
          };
        }

        tasksByDay[dayRecordId].tasks.push(task);

        // Update day record bounds
        if (
          task.startTime <
          (tasksByDay[dayRecordId].dayRecord.startTime || new Date())
        ) {
          tasksByDay[dayRecordId].dayRecord.startTime = task.startTime;
        }
        if (
          task.endTime &&
          task.endTime >
            (tasksByDay[dayRecordId].dayRecord.endTime || new Date(0))
        ) {
          tasksByDay[dayRecordId].dayRecord.endTime = task.endTime;
        }

        console.log(`✅ Successfully parsed task: "${task.title}"`);
        console.log(
          `   🕐 ${task.startTime.toISOString()} → ${
            task.endTime?.toISOString() || 'N/A'
          }`
        );
        console.log(
          `   ⏱️ Duration: ${
            task.duration ? task.duration / 60000 + ' minutes' : 'N/A'
          }`
        );
        console.log(`📁 Project: ${task.project || 'N/A'}`);

        importedCount++;
      } catch (error) {
        console.error(`❌ Error parsing line ${i + 1}:`, error);
        continue;
      }
    }

    // Create day records
    console.log('\n📅 Creating Day Records...');
    const newArchivedDays = [];

    for (const [dayId, { tasks, dayRecord }] of Object.entries(tasksByDay)) {
      const totalDuration = tasks.reduce(
        (sum, task) => sum + (task.duration || 0),
        0
      );

      const completeDay = {
        id: dayRecord.id,
        date: dayRecord.date,
        tasks: tasks,
        totalDuration: totalDuration,
        startTime: dayRecord.startTime,
        endTime: dayRecord.endTime,
        notes: dayRecord.notes
      };

      newArchivedDays.push(completeDay);
      console.log(`✅ Created day record: ${dayId}`);
      console.log(
        `   📋 ${tasks.length} tasks, ${totalDuration / 60000} minutes total`
      );
    }

    const result = {
      success: true,
      message: `Successfully imported ${importedCount} tasks in ${newArchivedDays.length} days`,
      importedCount,
      days: newArchivedDays
    };

    console.log('\n🎉 Import Test Results:');
    console.log(`✅ Success: ${result.success}`);
    console.log(`📊 Message: ${result.message}`);
    console.log(`📈 Imported Count: ${result.importedCount}`);
    console.log(`📅 Day Records Created: ${newArchivedDays.length}`);

    return result;
  } catch (error) {
    console.error('💥 Import failed:', error);
    return {
      success: false,
      message: `Import failed: ${error.message}`,
      importedCount: 0
    };
  }
}

// Auto-run the test
testFullImportProcess().then((result) => {
  console.log('\n' + '='.repeat(80));
  console.log('🏁 FINAL RESULT:', result.success ? '✅ PASS' : '❌ FAIL');
  console.log('='.repeat(80));
});
