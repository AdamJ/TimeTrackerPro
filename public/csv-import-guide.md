# CSV Import Template Guide

## Overview

This template shows the exact format required for importing time tracking data into TimeTrackerPro. The CSV must match the database schema exactly.

## Required Columns

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | string | Yes | Unique task identifier | "task-001" |
| `user_id` | string | Yes | User identifier (from auth system) | "your-user-id" |
| `title` | string | Yes | Task title/name | "Web Development" |
| `description` | string | No | Task description | "Fixed login bug" |
| `start_time` | string (ISO) | Yes | Task start timestamp | "2025-10-12T09:00:00.000Z" |
| `end_time` | string (ISO) | No | Task end timestamp | "2025-10-12T10:30:00.000Z" |
| `duration` | number | No | Duration in milliseconds | 5400000 (1.5 hours) |
| `project_id` | string | No | Project identifier | "proj-001" |
| `project_name` | string | No | Project name (denormalized) | "Web Development" |
| `client` | string | No | Client name | "Acme Corp" |
| `category_id` | string | No | Category identifier | "cat-001" |
| `category_name` | string | No | Category name (denormalized) | "Development" |
| `day_record_id` | string | Yes | Day grouping identifier | "day-001" |
| `is_current` | boolean | Yes | Whether task is currently active | false |
| `inserted_at` | string (ISO) | Yes | Creation timestamp | "2025-10-12T10:30:00.000Z" |
| `updated_at` | string (ISO) | Yes | Last update timestamp | "2025-10-12T10:30:00.000Z" |

## Important Notes

### Data Types

- **Timestamps**: Must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
- **Duration**: In milliseconds (3600000 = 1 hour)
- **Booleans**: Use `true` or `false` (lowercase)
- **Strings**: Wrap in double quotes if they contain commas or special characters

### Required Fields

- `id`: Must be unique across all tasks
- `user_id`: Should match your authenticated user ID
- `title`: Cannot be empty
- `start_time`: Must be valid ISO timestamp
- `day_record_id`: Groups tasks into days
- `is_current`: Usually `false` for archived tasks
- `inserted_at` & `updated_at`: Creation and modification timestamps

### Grouping

- Tasks with the same `day_record_id` will be grouped into the same archived day
- Use format like "day-YYYY-MM-DD" for day record IDs

### Duration Calculation

If `end_time` is provided, duration should match:
```
duration = end_time - start_time (in milliseconds)
```

### Example Times

- 1 hour = 3600000 milliseconds
- 30 minutes = 1800000 milliseconds
- 15 minutes = 900000 milliseconds

## Usage

1. Download the template file: `time-tracker-import-template.csv`
2. Replace example data with your actual time entries
3. Ensure all required fields are filled
4. Use the Import function in the app to upload your CSV

## Validation

The import process will:

- Validate all required fields are present
- Check timestamp formats
- Skip duplicate IDs
- Group tasks by day_record_id
- Report any errors or warnings
