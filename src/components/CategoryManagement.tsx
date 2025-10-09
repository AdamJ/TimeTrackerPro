import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import { TaskCategory } from '@/config/categories';
import { useTimeTracking } from '@/hooks/useTimeTracking';

interface CategoryManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryManagement: React.FC<CategoryManagementProps> = ({
  isOpen,
  onClose
}) => {
  const { categories, addCategory, updateCategory, deleteCategory } =
    useTimeTracking();
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(
    null
  );
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6'
    });
    setEditingCategory(null);
    setIsAddingNew(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const categoryData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      color: formData.color
    };

    if (editingCategory) {
      updateCategory(editingCategory.id, categoryData);
    } else {
      addCategory(categoryData);
    }

    resetForm();
  };

  const handleEdit = (category: TaskCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color
    });
    setIsAddingNew(true);
  };

  const handleDelete = (categoryId: string) => {
    if (
      confirm(
        'Are you sure you want to delete this category? This action cannot be undone.'
      )
    ) {
      deleteCategory(categoryId);
    }
  };

  const predefinedColors = [
    '#3B82F6',
    '#8B5CF6',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#06B6D4',
    '#84CC16',
    '#F97316',
    '#6B7280',
    '#EC4899'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <Tag className="w-5 h-5" />
              <span>Category Management</span>
            </DialogTitle>
            <div className="flex items-center space-x-2 my-4">
              {/* Add New Category Button */}
              {!isAddingNew && (
                <Button onClick={() => setIsAddingNew(true)} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add/Edit Category Form */}
          {isAddingNew && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingCategory ? 'Edit Category' : 'Add Category'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Category Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value
                        }))
                      }
                      placeholder="Enter category name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value
                        }))
                      }
                      placeholder="Enter category description (optional)"
                      className="min-h-[80px] resize-none"
                    />
                  </div>

                  <div>
                    <Label htmlFor="color">Category Color</Label>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Input
                          id="color"
                          type="color"
                          value={formData.color}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              color: e.target.value
                            }))
                          }
                          className="w-16 h-10"
                        />
                        <span className="text-sm text-gray-500">
                          {formData.color}
                        </span>
                        <div
                          className="w-8 h-8 rounded-full border-2 border-gray-300"
                          style={{ backgroundColor: formData.color }}
                        />
                      </div>

                      {/* Predefined Colors */}
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm text-gray-600 w-full">
                          Quick colors:
                        </span>
                        {predefinedColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({ ...prev, color }))
                            }
                            className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${
                              formData.color === color
                                ? 'border-gray-800'
                                : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button type="submit">
                      {editingCategory ? 'Update' : 'Add'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Categories List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Categories ({categories.length})
            </h3>

            {categories.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    No categories yet. Add your first category to get started!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {categories.map((category) => (
                  <Card
                    key={category.id}
                    className="border-l-4"
                    style={{ borderLeftColor: category.color }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {category.name}
                              </h4>
                              {category.description && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {category.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(category)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(category.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
