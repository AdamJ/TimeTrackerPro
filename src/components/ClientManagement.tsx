import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	Plus,
	Users,
	Archive,
	RotateCcw,
	AlertTriangle,
	ChevronDown,
	ChevronRight
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { PageLayout } from "@/components/PageLayout";
import { toast } from "@/hooks/use-toast";

export const ClientManagement: React.FC = () => {
	const { clients, addClient, archiveClient, restoreClient, forceSyncToDatabase } =
		useTimeTracking();
	const [isAddingNew, setIsAddingNew] = useState(false);
	const [name, setName] = useState("");
	const [archiveError, setArchiveError] = useState<string | null>(null);
	const [showArchived, setShowArchived] = useState(false);

	const activeClients = clients.filter(client => !client.archived);
	const archivedClients = clients.filter(client => client.archived);

	const resetForm = () => {
		setName("");
		setIsAddingNew(false);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) return;
		addClient(trimmed);
		await forceSyncToDatabase();
		toast({
			title: "Client added",
			description: `"${trimmed}" has been added.`
		});
		resetForm();
	};

	const handleArchive = async (clientId: string) => {
		setArchiveError(null);
		const error = archiveClient(clientId);
		if (error) {
			setArchiveError(error);
			return;
		}
		await forceSyncToDatabase();
		const archivedName = clients.find(client => client.id === clientId)?.name;
		toast({
			title: "Client archived",
			description: archivedName ? `"${archivedName}" has been archived.` : undefined
		});
	};

	const handleRestore = async (clientId: string) => {
		setArchiveError(null);
		restoreClient(clientId);
		await forceSyncToDatabase();
		const restoredName = clients.find(client => client.id === clientId)?.name;
		toast({
			title: "Client restored",
			description: restoredName ? `"${restoredName}" has been restored.` : undefined
		});
	};

	return (
		<PageLayout
			title={<>Clients <span>({activeClients.length})</span></>}
			icon={<Users className="w-6 h-6" />}
			actions={
				<Button
					onClick={() => setIsAddingNew(true)}
					variant="default"
					disabled={isAddingNew}
				>
					<Plus className="w-4 h-4 sm:mr-2" />
					<span className="hidden sm:block">Add Client</span>
				</Button>
			}
		>
			<div className="max-w-6xl mx-auto p-6 print:p-4 space-y-6">
				{/* Blocked archive feedback */}
				{archiveError && (
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>Cannot archive client</AlertTitle>
						<AlertDescription>{archiveError}</AlertDescription>
					</Alert>
				)}

				{/* Add Client Form */}
				{isAddingNew && (
					<Card>
						<CardHeader>
							<CardTitle>Add Client</CardTitle>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleSubmit} className="space-y-4">
								<div>
									<Label htmlFor="client-name">
										Client Name <span className="text-destructive">*</span>
									</Label>
									<Input
										id="client-name"
										value={name}
										onChange={(e) => setName(e.target.value)}
										placeholder="Enter client name"
										required
									/>
								</div>
								<div className="flex space-x-2">
									<Button type="button" variant="ghost" onClick={resetForm}>
										Cancel
									</Button>
									<Button type="submit">Add</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				)}

				{/* Active Clients */}
				<div className="space-y-4">
					{activeClients.length === 0 ? (
						<Card>
							<CardContent className="text-center py-8">
								<Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
								<p className="text-muted-foreground">
									No clients yet. Add your first client to get started!
								</p>
							</CardContent>
						</Card>
					) : (
						<div className="grid gap-4">
							{activeClients.map((client) => (
								<Card key={client.id}>
									<CardContent className="p-4">
										<div className="flex items-center justify-between">
											<h4 className="font-semibold text-foreground">
												{client.name}
											</h4>
											<Button
												size="sm"
												variant="outline"
												onClick={() => handleArchive(client.id)}
											>
												<Archive className="w-3 h-3 sm:mr-2" />
												<span className="hidden sm:block">Archive</span>
											</Button>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</div>

				{/* Archived Clients (collapsed by default) */}
				{archivedClients.length > 0 && (
					<div className="space-y-4">
						<Button
							variant="ghost"
							onClick={() => setShowArchived((prev) => !prev)}
							className="px-0 hover:bg-transparent"
						>
							{showArchived ? (
								<ChevronDown className="w-4 h-4 mr-2" />
							) : (
								<ChevronRight className="w-4 h-4 mr-2" />
							)}
							Archived ({archivedClients.length})
						</Button>
						{showArchived && (
							<div className="grid gap-4">
								{archivedClients.map((client) => (
									<Card key={client.id} className="opacity-70">
										<CardContent className="p-4">
											<div className="flex items-center justify-between">
												<h4 className="font-semibold text-muted-foreground">
													{client.name}
												</h4>
												<Button
													size="sm"
													variant="outline"
													onClick={() => handleRestore(client.id)}
												>
													<RotateCcw className="w-3 h-3 sm:mr-2" />
													<span className="hidden sm:block">Restore</span>
												</Button>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</PageLayout>
	);
};
