// Error Handling Test
// This tests various error conditions and edge cases

async function testErrorHandling() {
  console.log('🧪 Testing CSV Import Error Handling...\n');

  const testCases = [
    {
      name: "Missing Headers",
      csv: `task_id,name,start,end
"task-001","Test Task","2025-10-12T09:00:00.000Z","2025-10-12T10:00:00.000Z"`,
      expectedError: true,
      description: "CSV with wrong headers"
    },
    {
      name: "Empty File",
      csv: "",
      expectedError: true,
      description: "Empty CSV file"
    },
    {
      name: "Headers Only",
      csv: "id,user_id,title,description,start_time,end_time,duration,project_id,project_name,client,category_id,category_name,day_record_id,is_current,inserted_at,updated_at",
      expectedError: false,
      description: "CSV with headers but no data"
    },
    {
      name: "Invalid Date Format",
      csv: `id,user_id,title,description,start_time,end_time,duration,project_id,project_name,client,category_id,category_name,day_record_id,is_current,inserted_at,updated_at
"task-001","","Test Task","Description","invalid-date","2025-10-12T10:00:00.000Z",3600000,"proj-001","Project","Client","cat-001","Category","day-001",false,"2025-10-12T10:00:00.000Z","2025-10-12T10:00:00.000Z"`,
      expectedError: false,
      description: "Task with invalid start_time should be skipped"
    },
    {
      name: "Missing Required Fields",
      csv: `id,user_id,title,description,start_time,end_time,duration,project_id,project_name,client,category_id,category_name,day_record_id,is_current,inserted_at,updated_at
"","","","","2025-10-12T09:00:00.000Z","2025-10-12T10:00:00.000Z",3600000,"proj-001","Project","Client","cat-001","Category","day-001",false,"2025-10-12T10:00:00.000Z","2025-10-12T10:00:00.000Z"`,
      expectedError: false,
      description: "Task with missing required fields should be skipped"
    },
    {
      name: "Malformed CSV Line",
      csv: `id,user_id,title,description,start_time,end_time,duration,project_id,project_name,client,category_id,category_name,day_record_id,is_current,inserted_at,updated_at
"task-001","","Test Task","Description","2025-10-12T09:00:00.000Z","2025-10-12T10:00:00.000Z",3600000,"proj-001","Project","Client","cat-001","Category","day-001",false,"2025-10-12T10:00:00.000Z"`,
      expectedError: false,
      description: "Line with wrong number of columns should be skipped"
    },
    {
      name: "Mixed Valid/Invalid Data",
      csv: `id,user_id,title,description,start_time,end_time,duration,project_id,project_name,client,category_id,category_name,day_record_id,is_current,inserted_at,updated_at
"task-001","","Valid Task","Description","2025-10-12T09:00:00.000Z","2025-10-12T10:00:00.000Z",3600000,"proj-001","Project","Client","cat-001","Category","day-001",false,"2025-10-12T10:00:00.000Z","2025-10-12T10:00:00.000Z"
"","","Invalid Task","","invalid-date","2025-10-12T11:00:00.000Z",1800000,"proj-002","Project 2","Client","cat-002","Category 2","day-001",false,"2025-10-12T11:00:00.000Z","2025-10-12T11:00:00.000Z"
"task-003","","Another Valid Task","Description 3","2025-10-12T12:00:00.000Z","2025-10-12T13:00:00.000Z",3600000,"proj-003","Project 3","Client","cat-003","Category 3","day-001",false,"2025-10-12T13:00:00.000Z","2025-10-12T13:00:00.000Z"`,
      expectedError: false,
      description: "Mix of valid and invalid tasks - should import only valid ones"
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Test Case: ${testCase.name}`);
    console.log(`📝 Description: ${testCase.description}`);
    console.log(`${'='.repeat(60)}`);

    try {
      const result = await simulateImport(testCase.csv);

      if (testCase.expectedError && result.success) {
        console.log(`❌ UNEXPECTED SUCCESS - Expected this test to fail`);
      } else if (!testCase.expectedError && !result.success) {
        console.log(`❌ UNEXPECTED FAILURE - Expected this test to succeed`);
      } else {
        console.log(`✅ EXPECTED RESULT`);
      }

      console.log(`📊 Result: ${result.success ? 'SUCCESS' : 'FAILURE'}`);
      console.log(`💬 Message: ${result.message}`);
      console.log(`📈 Imported: ${result.importedCount} tasks`);

    } catch (error) {
      console.log(`💥 EXCEPTION: ${error.message}`);
    }
  }
}

async function simulateImport(csvContent) {
  try {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return { success: false, message: 'CSV file is empty', importedCount: 0 };
    }

    const headerLine = lines[0];
    const expectedHeaders = [
      'id', 'user_id', 'title', 'description', 'start_time', 'end_time',
      'duration', 'project_id', 'project_name', 'client', 'category_id',
      'category_name', 'day_record_id', 'is_current', 'inserted_at', 'updated_at'
    ];

    // Validate headers
    const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return {
        success: false,
        message: `CSV missing required headers: ${missingHeaders.join(', ')}`,
        importedCount: 0
      };
    }

    const tasksByDay = {};
    let importedCount = 0;

    // Process each data line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
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
          console.warn(`⚠️ Skipping malformed CSV line ${i + 1}: expected ${headers.length} columns, got ${values.length}`);
          continue;
        }

        // Create task object from CSV data
        const taskData = {};
        headers.forEach((header, index) => {
          taskData[header] = values[index].replace(/^"|"$/g, '');
        });

        // Validate required fields
        if (!taskData.id || !taskData.title || !taskData.start_time) {
          console.warn(`⚠️ Skipping incomplete task on line ${i + 1}: missing required fields`);
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
          category: taskData.category_name || undefined,
        };

        // Validate dates
        if (isNaN(task.startTime.getTime())) {
          console.warn(`⚠️ Skipping task with invalid start_time on line ${i + 1}`);
          continue;
        }

        if (task.endTime && isNaN(task.endTime.getTime())) {
          task.endTime = undefined;
        }

        const dayRecordId = taskData.day_record_id;
        if (!dayRecordId) {
          console.warn(`⚠️ Skipping task without day_record_id on line ${i + 1}`);
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
        console.log(`✅ Successfully parsed task: "${task.title}"`);
        importedCount++;
      } catch (error) {
        console.warn(`⚠️ Error parsing line ${i + 1}:`, error.message);
        continue;
      }
    }

    // Create day records
    const newArchivedDays = [];
    for (const [dayId, { tasks, dayRecord }] of Object.entries(tasksByDay)) {
      const totalDuration = tasks.reduce((sum, task) => sum + (task.duration || 0), 0);
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
    }

    return {
      success: true,
      message: `Successfully imported ${importedCount} tasks in ${newArchivedDays.length} days`,
      importedCount
    };

  } catch (error) {
    console.error('CSV import error:', error);
    return {
      success: false,
      message: `Import failed: ${error.message}`,
      importedCount: 0
    };
  }
}

// Run the error handling tests
testErrorHandling().then(() => {
  console.log('\n' + '='.repeat(80));
  console.log('🏁 ERROR HANDLING TESTS COMPLETED');
  console.log('='.repeat(80));
});
