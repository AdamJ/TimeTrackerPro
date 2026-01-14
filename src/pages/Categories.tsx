import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, Tag, TagIcon } from 'lucide-react';
import { TimeTrackingProvider } from '@/contexts/TimeTrackingContext';
import { TaskCategory } from '@/config/categories';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import SiteNavigationMenu from '@/components/Navigation';

const CategoryContent: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory, forceSyncToDatabase } =
    useTimeTracking();
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(
    null
  );
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    isBillable: true
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      isBillable: true
    });
    setEditingCategory(null);
    setIsAddingNew(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const categoryData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      color: formData.color,
      isBillable: formData.isBillable
    };

    if (editingCategory) {
      updateCategory(editingCategory.id, categoryData);
    } else {
      addCategory(categoryData);
    }

    // Save changes to database
    await forceSyncToDatabase();

    resetForm();
  };

  const handleEdit = (category: TaskCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
      isBillable: category.isBillable !== false // Default to true if not specified
    });
    setIsAddingNew(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (
      confirm(
        'Are you sure you want to delete this category? This action cannot be undone.'
      )
    ) {
      deleteCategory(categoryId);
      // Save changes to database
      await forceSyncToDatabase();
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Navigation Header */}
      <SiteNavigationMenu />
      {/* Main Content */}
      <div className="max-w-6xl mx-auto pt-4 pb-2 px-4 md:p-6 print:p-4">
        <div className="flex items-center justify-between">
          <h1 className="md:text-2xl font-bold text-gray-900 flex items-center space-x-1">
            <TagIcon className="w-6 h-6 mr-1" />
            Categories
            <span>({categories.length})</span>
          </h1>
          {/* Add New Category Button */}
          {!isAddingNew && (
            <Button onClick={() => setIsAddingNew(true)} variant="default">
              <Plus className="w-4 h-4" />
              Add Category
            </Button>
          )}
          {isAddingNew && (
            <>
              <Button
                onClick={() => setIsAddingNew(true)}
                variant="default"
                disabled
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:block">Add Category</span>
              </Button>
            </>
          )}
        </div>
      </div>
      {/* Add/Edit Project Form */}
      {isAddingNew && (
        <div className="max-w-6xl mx-auto p-6 print:p-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">
                    Category Name <span className="text-red-700">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
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
                    placeholder="Enter category description"
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
                        className="w-8 h-8 rounded-full"
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
                          className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${formData.color === color
                              ? 'border-gray-800'
                              : 'border-gray-300'
                            }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="billable"
                    checked={formData.isBillable}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        isBillable: checked === true
                      }))
                    }
                  />
                  <Label htmlFor="billable" className="text-sm font-medium">
                    Billable category
                  </Label>
                  <span className="text-xs text-gray-500">
                    (Tasks in this category can generate revenue)
                  </span>
                </div>

                <div className="flex space-x-2">
                  <Button type="button" variant="ghost" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingCategory ? 'Update' : 'Add'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
      <div className="max-w-6xl mx-auto p-6 print:p-4">
        {/* Categories List */}
        <div className="space-y-4">
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
                            <div className="flex items-center space-x-2">
                              <h4 className="font-semibold text-gray-900">
                                {category.name}
                              </h4>
                              <span className={`px-2 py-1 text-xs rounded-full ${category.isBillable !== false
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                                }`}>
                                {category.isBillable !== false ? 'Billable' : 'Non-billable'}
                              </span>
                            </div>
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
    </div>
  );
};

const Categories: React.FC = () => {
  return (
    <CategoryContent />
  );
};

export default Categories;
