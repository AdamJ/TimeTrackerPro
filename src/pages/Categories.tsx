import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Tag, TagIcon, Trash2Icon } from "lucide-react";
import { TaskCategory } from "@/config/categories";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { PageLayout } from "@/components/PageLayout";
import { CategorySheet } from "@/components/CategorySheet";
import { Badge } from "@/components/ui/badge";
import { Item, ItemContent, ItemMedia, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";

const CategoryContent: React.FC = () => {
  const { categories, deleteCategory, forceSyncToDatabase } = useTimeTracking();
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(
    null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleOpenAdd = useCallback(() => {
    setEditingCategory(null);
    setSheetOpen(true);
  }, []);

  const handleEdit = (category: TaskCategory) => {
    setEditingCategory(category);
    setSheetOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    deleteCategory(deleteTargetId);
    await forceSyncToDatabase();
    setDeleteTargetId(null);
  };

  const pageTitle = useMemo(() => <>Categories</>, []);
  const pageBadge = useMemo(
    () => <Badge variant="outline">{categories.length}</Badge>,
    [categories.length]
  );
  const pageActions = useMemo(
    () => (
      <Button onClick={handleOpenAdd} size="sm" variant="default">
        <Plus className="w-4 h-4 sm:mr-1" />
        <span className="hidden sm:block">Add Category</span>
      </Button>
    ),
    [handleOpenAdd]
  );

  return (
    <PageLayout
      title={pageTitle}
      badge={pageBadge}
      actions={pageActions}
    >
      <div className="max-w-6xl mx-auto p-6 print:p-4">
        {/* Categories List */}
        <div className="space-y-4">
          {categories.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No categories yet. Add your first category to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {categories.map((category) => (
                <Item
                  key={category.id}
                  variant="outline"
                  className="shadow-none duration-100 hover:shadow-md transition-shadow"
                >
                  <ItemMedia>
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>
                      {category.name}
                      <div className="hidden sm:flex flex-wrap gap-1 ml-2">
                        {category.isBillable !== false ? (
                          <Badge variant="outline" color="green">Billable</Badge>
                        ) : (
                          <Badge variant="outline" color="gray">Non-billable</Badge>
                        )}
                      </div>
                    </ItemTitle>
                    <ItemDescription>
                      {category.description}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      <span className="hidden sm:block">Edit</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteTargetId(category.id)}
                      className="text-destructive hover:text-secondary bg-transparent hover:bg-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      <span className="hidden sm:block">Delete</span>
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </div>
          )}
        </div>
      </div>
      <AlertDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              variant="destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CategorySheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setEditingCategory(null);
        }}
        mode={editingCategory ? "edit" : "add"}
        category={editingCategory ?? undefined}
      />
    </PageLayout>
  );
};

const Categories: React.FC = () => {
  return <CategoryContent />;
};

export default Categories;
