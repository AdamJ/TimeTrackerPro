import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Download,
  Upload,
  Calendar as CalendarIcon,
  FileText,
  Database,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { formatDate } from '@/utils/timeUtil';
import { cn } from '@/lib/util';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose
}) => {
  const {
    exportToCSV,
    exportToJSON,
    importFromCSV,
    generateInvoiceData,
    projects,
    archivedDays
  } = useTimeTracking();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [exportType, setExportType] = useState<'csv' | 'json' | 'invoice'>(
    'csv'
  );
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [mode, setMode] = useState<'export' | 'import'>('export');
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; importedCount: number } | null>(null);

  // Get unique clients from projects
  const clients = Array.from(new Set(projects.map((p) => p.client))).filter(
    Boolean
  );

  const handleExport = () => {
    let content = '';
    let filename = '';
    let mimeType = '';

    const dateRange =
      startDate && endDate
        ? `_${startDate.toISOString().split('T')[0]}_to_${
            endDate.toISOString().split('T')[0]
          }`
        : '';

    switch (exportType) {
      case 'csv':
        content = exportToCSV(startDate, endDate);
        filename = `timetracker_export${dateRange}.csv`;
        mimeType = 'text/csv';
        break;
      case 'json':
        content = exportToJSON(startDate, endDate);
        filename = `timetracker_export${dateRange}.json`;
        mimeType = 'application/json';
        break;
      case 'invoice': {
        if (!selectedClient || !startDate || !endDate) {
          alert('Please select a client and date range for invoice generation');
          return;
        }
        const invoiceData = generateInvoiceData(
          selectedClient,
          startDate,
          endDate
        );
        content = JSON.stringify(invoiceData, null, 2);
        filename = `invoice_${selectedClient.replace(
          /\s+/g,
          '_'
        )}${dateRange}.json`;
        mimeType = 'application/json';
        break;
      }
    }

    // Create and download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onClose();
  };

  const handleImport = () => {
    setImportResult(null); // Clear any previous results
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setImportResult({
        success: false,
        message: "Please select a CSV file.",
        importedCount: 0
      });
      return;
    }

    try {
      const content = await file.text();
      const result = await importFromCSV(content);

      setImportResult(result);

      if (result.success) {
        // Optional: Auto-close after successful import
        // setTimeout(() => onClose(), 3000);
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        importedCount: 0
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {mode === 'export' ? (
              <>
                <Download className="w-5 h-5" />
                <span>Manage Time Data</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Manage Time Data</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mode Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Management Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={mode}
                onValueChange={(value: 'export' | 'import') => {
                  setMode(value);
                  setImportResult(null); // Clear import results when switching modes
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="export">
                    <div className="flex items-center space-x-2">
                      <Download className="w-4 h-4" />
                      <span>Export Data</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="import">
                    <div className="flex items-center space-x-2">
                      <Upload className="w-4 h-4" />
                      <span>Import Data</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {mode === 'export' ? (
            <>
              {/* Export Type Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Export Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={exportType}
                    onValueChange={(value: 'csv' | 'json' | 'invoice') =>
                      setExportType(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span>CSV Spreadsheet</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="json">
                    <div className="flex items-center space-x-2">
                      <Database className="w-4 h-4" />
                      <span>JSON Data</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="invoice">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span>Invoice Data</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Date Range Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Date Range (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !startDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? formatDate(startDate) : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !endDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? formatDate(endDate) : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Selection for Invoice */}
          {exportType === 'invoice' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Client Selection</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedClient}
                  onValueChange={setSelectedClient}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client for invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client} value={client}>
                        {client}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Export Summary - only for export mode */}
          {mode === 'export' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Total archived days: {archivedDays.length}</p>
                  {startDate && endDate && (
                    <p>
                      Date range: {formatDate(startDate)} to {formatDate(endDate)}
                    </p>
                  )}
                  {exportType === 'invoice' && selectedClient && (
                    <p>Client: {selectedClient}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

            </>
          ) : (
            <>
              {/* Import Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Import CSV File</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Select a CSV file that was previously exported from this application.
                      The file must match the expected database schema format.
                    </p>

                    {/* Import Result Alert */}
                    {importResult && (
                      <Alert className={`${importResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <div className="flex items-center space-x-2">
                          {importResult.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <AlertDescription className={`${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                            <strong>{importResult.success ? 'Success!' : 'Error:'}</strong> {importResult.message}
                            {importResult.success && importResult.importedCount > 0 && (
                              <span className="block mt-1 text-sm">
                                {importResult.importedCount} tasks imported successfully.
                              </span>
                            )}
                          </AlertDescription>
                        </div>
                      </Alert>
                    )}

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600 mb-2">
                        Click to select a CSV file
                      </p>
                      <Button onClick={handleImport} variant="outline">
                        Choose File
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Import Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Import Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600 space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-blue-800">Need a template?</p>
                          <p className="text-blue-600">Download a blank CSV template with the correct format</p>
                        </div>
                        <a
                          href="/time-tracker-import-template.csv"
                          download="time-tracker-import-template.csv"
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Template
                        </a>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p>• Only CSV files exported from this application are supported</p>
                      <p>• Duplicate entries (based on ID) will be skipped</p>
                      <p>• Tasks will be grouped by day and added to archived days</p>
                      <p>• Invalid or malformed entries will be skipped with warnings</p>
                      <p>• See the template for exact format requirements</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {mode === 'export' ? (
              <Button
                onClick={handleExport}
                disabled={
                  exportType === 'invoice' &&
                  (!selectedClient || !startDate || !endDate)
                }
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            ) : (
              <Button onClick={handleImport}>
                <Upload className="w-4 h-4 mr-2" />
                Select CSV File
              </Button>
            )}
          </div>

          {/* Hidden file input for import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
