'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  LoadingSpinner,
  Modal,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import {
  Camera,
  Plus,
  Upload,
  Image as ImageIcon,
  Trash2,
  X,
  Calendar,
  Tag,
  User,
  Heart,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Download,
  Filter,
  Pencil,
} from 'lucide-react';
import Link from 'next/link';

interface Photo {
  id: string;
  user_id: string;
  animal_id: string | null;
  health_record_id: string | null;
  inspection_id: string | null;
  category: string;
  filename: string;
  url: string;
  caption: string | null;
  date_taken: string;
  created_at: string;
}

const PHOTO_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'conformation', label: 'Conformation' },
  { value: 'health', label: 'Health Issue' },
  { value: 'injury', label: 'Injury' },
  { value: 'predation', label: 'Predation' },
  { value: 'kidding', label: 'Kidding' },
  { value: 'show', label: 'Show' },
  { value: 'sale', label: 'For Sale' },
  { value: 'progress', label: 'Progress' },
  { value: 'other', label: 'Other' },
];

export default function PhotoGalleryPage() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [filterAnimal, setFilterAnimal] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    animal_id: '',
    category: 'general',
    caption: '',
    date_taken: new Date().toISOString().split('T')[0],
    files: [] as File[],
  });

  // Edit photo state
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editForm, setEditForm] = useState({ caption: '', category: '' });

  // Fetch animals
  const { data: animals } = useQuery({
    queryKey: ['animals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('user_id', user!.id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch photos
  const { data: photos, isLoading: photosLoading } = useQuery({
    queryKey: ['photos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', user!.id)
        .order('date_taken', { ascending: false });
      if (error) throw error;
      return data as Photo[];
    },
    enabled: !!user,
  });

  // Upload photo mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: { file: File; metadata: Partial<Photo> }) => {
      const { file, metadata } = data;
      
      // Generate unique filename
      const ext = file.name.split('.').pop();
      const filename = `${user!.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false,
        });
      
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(filename);

      // Save photo record
      const { error: insertError } = await (supabase as any)
        .from('photos')
        .insert({
          ...metadata,
          user_id: user!.id,
          filename,
          url: urlData.publicUrl,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });

  // Delete photo mutation
  const deleteMutation = useMutation({
    mutationFn: async (photo: Photo) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([photo.filename]);
      
      if (storageError) console.error('Storage delete error:', storageError);

      // Delete record
      const { error: dbError } = await (supabase as any)
        .from('photos')
        .delete()
        .eq('id', photo.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });

  // Update photo metadata mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, caption, category }: { id: string; caption: string | null; category: string }) => {
      const { error } = await (supabase.from('photos') as any)
        .update({ caption, category })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadForm(prev => ({ ...prev, files }));
  }, []);

  // Handle upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadForm.files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < uploadForm.files.length; i++) {
        const file = uploadForm.files[i];
        
        await uploadMutation.mutateAsync({
          file,
          metadata: {
            animal_id: uploadForm.animal_id || null,
            category: uploadForm.category,
            caption: uploadForm.caption || null,
            date_taken: uploadForm.date_taken,
          },
        });

        setUploadProgress(((i + 1) / uploadForm.files.length) * 100);
      }

      setShowUploadModal(false);
      setUploadForm({
        animal_id: '',
        category: 'general',
        caption: '',
        date_taken: new Date().toISOString().split('T')[0],
        files: [],
      });
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading photos. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Filter photos
  const filteredPhotos = useMemo(() => {
    let result = (photos as Photo[]) || [];
    
    if (filterAnimal !== 'all') {
      result = result.filter(p => p.animal_id === filterAnimal);
    }
    
    if (filterCategory !== 'all') {
      result = result.filter(p => p.category === filterCategory);
    }
    
    return result;
  }, [photos, filterAnimal, filterCategory]);

  // Group photos by animal
  const photosByAnimal = useMemo(() => {
    const grouped: Record<string, Photo[]> = { 'no_animal': [] };
    
    (photos as Photo[] || []).forEach(photo => {
      if (photo.animal_id) {
        if (!grouped[photo.animal_id]) grouped[photo.animal_id] = [];
        grouped[photo.animal_id].push(photo);
      } else {
        grouped['no_animal'].push(photo);
      }
    });
    
    return grouped;
  }, [photos]);

  // Stats
  const stats = useMemo(() => {
    const photosList = (photos as Photo[]) || [];
    const animalsList = (animals as any[]) || [];
    
    const totalPhotos = photosList.length;
    const animalsWithPhotos = new Set(photosList.filter(p => p.animal_id).map(p => p.animal_id)).size;
    const healthPhotos = photosList.filter(p => ['health', 'injury', 'predation'].includes(p.category)).length;
    
    return {
      totalPhotos,
      animalsWithPhotos,
      totalAnimals: animalsList.length,
      healthPhotos,
    };
  }, [photos, animals]);

  // Lightbox navigation
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setShowLightbox(true);
  };

  const nextPhoto = () => {
    setLightboxIndex((prev) => (prev + 1) % filteredPhotos.length);
  };

  const prevPhoto = () => {
    setLightboxIndex((prev) => (prev - 1 + filteredPhotos.length) % filteredPhotos.length);
  };

  // Open edit modal for a photo
  const openEditPhoto = (photo: Photo) => {
    setEditingPhoto(photo);
    setEditForm({ caption: photo.caption || '', category: photo.category });
  };

  // Save edited photo metadata
  const handleSaveEdit = async () => {
    if (!editingPhoto) return;
    try {
      await updateMutation.mutateAsync({
        id: editingPhoto.id,
        caption: editForm.caption || null,
        category: editForm.category,
      });
      setEditingPhoto(null);
    } catch (error) {
      console.error('Update error:', error);
      alert('Error saving changes. Please try again.');
    }
  };

  // Get animal name
  const getAnimalName = (animalId: string | null) => {
    if (!animalId) return 'No Animal';
    const animal = (animals as any[])?.find(a => a.id === animalId);
    return animal?.name || 'Unknown';
  };

  if (photosLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Photo Gallery</h1>
          <p className="text-gray-500">Manage photos of your animals and events</p>
        </div>
        <Button
          onClick={() => setShowUploadModal(true)}
          leftIcon={<Upload className="h-4 w-4" />}
        >
          Upload Photos
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card padding="sm" className="text-center">
          <Camera className="h-5 w-5 mx-auto mb-1 text-primary-600" />
          <p className="text-2xl font-bold">{stats.totalPhotos}</p>
          <p className="text-xs text-gray-500">Total Photos</p>
        </Card>
        <Card padding="sm" className="text-center">
          <User className="h-5 w-5 mx-auto mb-1 text-blue-600" />
          <p className="text-2xl font-bold">{stats.animalsWithPhotos}</p>
          <p className="text-xs text-gray-500">Animals with Photos</p>
        </Card>
        <Card padding="sm" className="text-center">
          <Heart className="h-5 w-5 mx-auto mb-1 text-red-600" />
          <p className="text-2xl font-bold">{stats.healthPhotos}</p>
          <p className="text-xs text-gray-500">Health/Injury Photos</p>
        </Card>
        <Card padding="sm" className="text-center">
          <ImageIcon className="h-5 w-5 mx-auto mb-1 text-green-600" />
          <p className="text-2xl font-bold">{stats.totalAnimals - stats.animalsWithPhotos}</p>
          <p className="text-xs text-gray-500">Need Photos</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Select
              label="Filter by Animal"
              options={[
                { value: 'all', label: 'All Animals' },
                { value: 'no_animal', label: 'No Animal Tagged' },
                ...((animals as any[]) || []).map((a: any) => ({
                  value: a.id,
                  label: a.name,
                })),
              ]}
              value={filterAnimal}
              onChange={(e) => setFilterAnimal(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Select
              label="Filter by Category"
              options={[
                { value: 'all', label: 'All Categories' },
                ...PHOTO_CATEGORIES,
              ]}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Photo Grid */}
      {filteredPhotos.length === 0 ? (
        <Card className="p-12 text-center">
          <Camera className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Photos Yet</h3>
          <p className="text-gray-500 mb-4">Upload photos to document your herd</p>
          <Button
            onClick={() => setShowUploadModal(true)}
            leftIcon={<Upload className="h-4 w-4" />}
          >
            Upload First Photo
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredPhotos.map((photo, index) => (
            <div
              key={photo.id}
              className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
              onClick={() => openLightbox(index)}
            >
              <img
                src={photo.url}
                alt={photo.caption || 'Photo'}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="h-8 w-8 text-white" />
                </div>
              </div>

              {/* Info badges */}
              <div className="absolute top-2 left-2 flex gap-1">
                {photo.animal_id && (
                  <Badge variant="default" className="bg-black/60 text-white text-xs">
                    {getAnimalName(photo.animal_id)}
                  </Badge>
                )}
              </div>
              
              <div className="absolute bottom-2 left-2 right-2">
                <Badge 
                  variant={
                    ['health', 'injury', 'predation'].includes(photo.category) ? 'danger' :
                    photo.category === 'show' ? 'success' : 'default'
                  }
                  className="text-xs"
                >
                  {PHOTO_CATEGORIES.find(c => c.value === photo.category)?.label || photo.category}
                </Badge>
              </div>

              {/* Action buttons */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditPhoto(photo);
                  }}
                  className="p-1.5 bg-primary-600 text-white rounded-full hover:bg-primary-700"
                  title="Edit caption and category"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this photo?')) {
                      deleteMutation.mutate(photo);
                    }
                  }}
                  className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                  title="Delete photo"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        open={showUploadModal}
        onClose={() => !isUploading && setShowUploadModal(false)}
        title="Upload Photos"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          {/* File Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Photos
            </label>
            <label className="block">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer">
                {uploadForm.files.length > 0 ? (
                  <div>
                    <Camera className="h-8 w-8 mx-auto mb-2 text-primary-600" />
                    <p className="font-medium text-gray-900">{uploadForm.files.length} photo(s) selected</p>
                    <p className="text-sm text-gray-500">Click to change selection</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="font-medium text-gray-700">Click to select photos</p>
                    <p className="text-sm text-gray-500">JPG, PNG, or WebP</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>

          <Select
            label="Animal (optional)"
            options={[
              { value: '', label: 'No specific animal' },
              ...((animals as any[]) || []).map((a: any) => ({
                value: a.id,
                label: a.name,
              })),
            ]}
            value={uploadForm.animal_id}
            onChange={(e) => setUploadForm(prev => ({ ...prev, animal_id: e.target.value }))}
          />

          <Select
            label="Category"
            options={PHOTO_CATEGORIES}
            value={uploadForm.category}
            onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
          />

          <Input
            label="Date Taken"
            type="date"
            value={uploadForm.date_taken}
            onChange={(e) => setUploadForm(prev => ({ ...prev, date_taken: e.target.value }))}
          />

          <Input
            label="Caption (optional)"
            value={uploadForm.caption}
            onChange={(e) => setUploadForm(prev => ({ ...prev, caption: e.target.value }))}
            placeholder="Add a description..."
          />

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUploadModal(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading || uploadForm.files.length === 0}
              leftIcon={isUploading ? <LoadingSpinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
            >
              {isUploading ? 'Uploading...' : `Upload ${uploadForm.files.length || ''} Photo${uploadForm.files.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Photo Modal */}
      <Modal
        open={!!editingPhoto}
        onClose={() => !updateMutation.isPending && setEditingPhoto(null)}
        title="Edit Photo"
      >
        {editingPhoto && (
          <div className="space-y-4">
            <div className="rounded-lg overflow-hidden bg-gray-100">
              <img
                src={editingPhoto.url}
                alt={editForm.caption || 'Photo'}
                className="w-full max-h-64 object-contain"
              />
            </div>

            <Select
              label="Category"
              options={PHOTO_CATEGORIES}
              value={editForm.category}
              onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
            />

            <Input
              label="Caption (optional)"
              value={editForm.caption}
              onChange={(e) => setEditForm(prev => ({ ...prev, caption: e.target.value }))}
              placeholder="Add a description..."
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingPhoto(null)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                leftIcon={updateMutation.isPending ? <LoadingSpinner className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Lightbox */}
      {showLightbox && filteredPhotos.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 z-10"
          >
            <X className="h-8 w-8" />
          </button>

          {/* Navigation */}
          {filteredPhotos.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-4 p-2 text-white hover:text-gray-300 z-10"
              >
                <ChevronLeft className="h-10 w-10" />
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-4 p-2 text-white hover:text-gray-300 z-10"
              >
                <ChevronRight className="h-10 w-10" />
              </button>
            </>
          )}

          {/* Image */}
          <img
            src={filteredPhotos[lightboxIndex].url}
            alt={filteredPhotos[lightboxIndex].caption || 'Photo'}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />

          {/* Info bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white p-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {getAnimalName(filteredPhotos[lightboxIndex].animal_id)}
                  {filteredPhotos[lightboxIndex].animal_id && (
                    <Link
                      href={`/dashboard/herd/${filteredPhotos[lightboxIndex].animal_id}`}
                      className="ml-2 text-primary-400 hover:underline text-sm"
                      onClick={() => setShowLightbox(false)}
                    >
                      View Profile →
                    </Link>
                  )}
                </p>
                {filteredPhotos[lightboxIndex].caption && (
                  <p className="text-gray-300 text-sm">{filteredPhotos[lightboxIndex].caption}</p>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>{formatDate(filteredPhotos[lightboxIndex].date_taken)}</span>
                <Badge variant="default" className="bg-white/20">
                  {PHOTO_CATEGORIES.find(c => c.value === filteredPhotos[lightboxIndex].category)?.label}
                </Badge>
                <button
                  onClick={() => openEditPhoto(filteredPhotos[lightboxIndex])}
                  className="flex items-center gap-1 text-white hover:text-primary-400"
                  title="Edit caption and category"
                >
                  <Pencil className="h-4 w-4" />
                  <span>Edit</span>
                </button>
                <span>{lightboxIndex + 1} / {filteredPhotos.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
