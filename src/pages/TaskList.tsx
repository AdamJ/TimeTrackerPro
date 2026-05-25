import { PageLayout } from "@/components/PageLayout";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LayoutGrid } from "lucide-react";

const TaskList = () => {
	return (
		<PageLayout
			title="Tasks"
			icon={<LayoutGrid className="w-5 h-5" />}
		>
			<div className="max-w-7xl mx-auto pt-4 pb-6 px-4 md:p-6">
				<KanbanBoard />
			</div>
		</PageLayout>
	);
};

export default TaskList;
