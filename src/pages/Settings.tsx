import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ExportDialog } from '@/components/ExportDialog';
import {
	Briefcase,
	Tag,
	Download,
	Database,
	Trash2,
	CogIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { PageLayout } from '@/components/PageLayout';

const SettingsContent: React.FC = () => {
	const { archivedDays, projects, categories } = useTimeTracking();
	const [showExportDialog, setShowExportDialog] = useState(false);
	const [showClearDataDialog, setShowClearDataDialog] = useState(false);

	const handleClearAllData = () => {
		localStorage.clear();
		// Navigate to root instead of reload() so Capacitor's JS bridge is not interrupted
		window.location.replace(window.location.pathname);
	};

	return (
		<PageLayout title="Settings" icon={<CogIcon className="w-6 h-6" />}>
			<div className="max-w-6xl mx-auto p-6">
				<div className="grid gap-6">
					{/* Overview Stats */}
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-4 print:hidden">
						<Card>
							<CardContent className="p-4">
								<div className="text-2xl font-bold text-primary">
									{archivedDays.length}
								</div>
								<div className="text-sm text-muted-foreground">Archived Days</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-4">
								<div className="text-2xl font-bold text-primary">
									{projects.length}
								</div>
								<div className="text-sm text-muted-foreground">Projects</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-4">
								<div className="text-2xl font-bold text-primary">
									{categories.length}
								</div>
								<div className="text-sm text-muted-foreground">Categories</div>
							</CardContent>
						</Card>
					</div>
					{/* Management Sections */}
					<div className="grid gap-6 md:grid-cols-2">
						{/* Project Management */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center space-x-2">
									<Briefcase className="w-5 h-5" />
									<span>Project Management</span>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground mb-4">
									Manage your projects, clients, and hourly rates. Projects help
									organize your tasks and calculate revenue automatically.
								</p>
								<Link to="/projectlist">
									<Button variant="outline" className="w-full">
										<Briefcase className="w-4 h-4 mr-2" />
										Manage Projects
									</Button>
								</Link>
							</CardContent>
						</Card>
						{/* Category Management */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center space-x-2">
									<Tag className="w-5 h-5" />
									<span>Category Management</span>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground mb-4">
									Create and manage task categories like Development, Design,
									Meetings, etc. Categories help classify your work.
								</p>
								<Link to="/categories">
									<Button variant="outline" className="w-full">
										<Briefcase className="w-4 h-4 mr-2" />
										Manage Categories
									</Button>
								</Link>
							</CardContent>
						</Card>
						{/* Data Export */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center space-x-2">
									<Download className="w-5 h-5" />
									<span>Exports/Imports</span>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground mb-4">
									Export your time tracking data as CSV or JSON files. Generate invoice data for specific clients and date ranges. You can also import data from CSV files.
								</p>
								<Button
									onClick={() => setShowExportDialog(true)}
									variant="outline"
									className="w-full"
								>
									<Download className="w-4 h-4 mr-2" />
									Data Export/Import
								</Button>
							</CardContent>
						</Card>
						{/* Data Management */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center space-x-2">
									<Database className="w-5 h-5" />
									<span>Data Management</span>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground mb-4">
									Manage your stored data. All data is stored locally in your
									browser. Use export before clearing data.
								</p>
								<div className="space-y-2">
									<Link to="/archive">
										<Button variant="outline" className="w-full">
											<Database className="w-4 h-4 mr-2" />
											View Archive
										</Button>
									</Link>
									<Button
										onClick={() => setShowClearDataDialog(true)}
										variant="outline"
										className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
									>
										<Trash2 className="w-4 h-4 mr-2" />
										Clear All Data
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>
					{/* Quick Tips */}
					<Card>
						<CardHeader>
							<CardTitle>Quick Tips</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid gap-4 md:grid-cols-2">
								<div>
									<h4 className="font-medium text-foreground mb-2">
										Getting Started
									</h4>
									<ul className="text-sm text-muted-foreground space-y-1">
										<li>
											• Set up projects with hourly rates for automatic revenue
											calculation
										</li>
										<li>
											• Create categories to classify different types of work
										</li>
										<li>• Use task descriptions for detailed work notes</li>
									</ul>
								</div>
								<div>
									<h4 className="font-medium text-foreground mb-2">
										Best Practices
									</h4>
									<ul className="text-sm text-muted-foreground space-y-1">
										<li>• Export your data regularly as backup</li>
										<li>
											• Adjust task times in 15-minute intervals for accuracy
										</li>
										<li>• Use consistent project and category naming</li>
									</ul>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Dialogs */}
			<ExportDialog
				isOpen={showExportDialog}
				onClose={() => setShowExportDialog(false)}
			/>
			<AlertDialog open={showClearDataDialog} onOpenChange={setShowClearDataDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Clear all data?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete all archived days, projects, and categories.
							This action cannot be undone. Export your data first if you want a backup.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleClearAllData}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete everything
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</PageLayout>
	);
};

const Settings: React.FC = () => {
	return <SettingsContent />;
};

export default Settings;
