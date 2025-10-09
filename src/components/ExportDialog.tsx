import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Calendar as CalendarIcon,
  FileText,
  Database
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
    generateInvoiceData,
    projects,
    archivedDays
  } = useTimeTracking();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [exportType, setExportType] = useState<'csv' | 'json' | 'invoice'>(
    'csv'
  );
  const [selectedClient, setSelectedClient] = useState<string>('');

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="w-5 h-5" />
            <span>Export Time Data</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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

          {/* Export Summary */}
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

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
