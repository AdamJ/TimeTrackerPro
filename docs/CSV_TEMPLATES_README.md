# CSV Import Templates for TimeTrackerPro

## Available Templates

### 1. **Blank Template** (`time-tracker-blank-template.csv`)
- Contains only the header row with all required column names
- Perfect for starting from scratch
- Headers: `id,user_id,title,description,start_time,end_time,duration,project_id,project_name,client,category_id,category_name,day_record_id,is_current,inserted_at,updated_at`

### 2. **Example Template** (`time-tracker-import-template.csv`)
- Contains headers plus 2 sample rows showing correct data format
- Useful for understanding the expected data structure
- Shows proper timestamp formatting, duration calculation, etc.

### 3. **Documentation** (`csv-import-guide.md`)
- Complete field reference with descriptions
- Data type requirements
- Formatting examples
- Validation rules

## How to Use

1. **In the App**: Go to Menu → Export/Import Data → Import → Download Template
2. **Direct Download**: Templates are available in the `/public` folder
3. **Fill Data**: Replace/add your time tracking data
4. **Import**: Use the Import function in the app

## Key Requirements

- **Required Fields**: `id`, `user_id`, `title`, `start_time`, `day_record_id`, `is_current`, `inserted_at`, `updated_at`
- **Date Format**: ISO 8601 (e.g., "2025-10-12T09:00:00.000Z")
- **Duration**: In milliseconds (3600000 = 1 hour)
- **Unique IDs**: Each task must have a unique `id`
- **Day Grouping**: Tasks with same `day_record_id` are grouped together

## Quick Example Row
```csv
"task-001","user-123","Web Development","Fixed login bug","2025-10-12T09:00:00.000Z","2025-10-12T10:30:00.000Z",5400000,"proj-001","Website Project","Acme Corp","cat-dev","Development","day-2025-10-12",false,"2025-10-12T10:30:00.000Z","2025-10-12T10:30:00.000Z"
```

This represents a 1.5-hour task completed on October 12, 2025.
