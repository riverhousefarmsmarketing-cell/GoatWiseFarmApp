'use client';

import { useState, useCallback } from 'react';
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
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
} from 'lucide-react';

interface Photo {
  id: string;
  user_id: string;
  animal_id: string | null;
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

interface AnimalPhotosProps {
  animalId: string;
  animalName: string;
}

export function AnimalPhotos({ animalId, animalName }: AnimalPhotosProps) {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [uploadForm, setUploadForm] = useState({
    category: 'general',
    caption: '',
    date_taken: new Date().toISOString().split('T')[0],
    files: [] as File[],
  });

  // Fetch photos for this animal
  const { data: photos, isLoading } = useQuery({
    queryKey: ['animal_photos', animalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('animal_id', animalId)
        .order('date_taken', { ascending: false });
      if (error) throw error;
      return data as Photo[];
    },
    enabled: !!animalId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: { file: File; metadata: Partial<Photo> }) => {
      const { file, metadata } = data;
      
      const ext = file.name.split('.').pop();
      const filename = `${user!.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false,
        });
      
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(filename);

      const { error: insertError } = await (supabase as any)
        .from('photos')
        .insert({
          ...metadata,
          user_id: user!.id,
          animal_id: animalId,
          filename,
          url: urlData.publicUrl,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animal_photos', animalId] });
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (photo: Photo) => {
      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([photo.filename]);
      
      if (storageError) console.error('Storage delete error:', storageError);

      const { error: dbError } = await (supabase as any)
        .from('photos')
        .delete()
        .eq('id', photo.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animal_photos', animalId] });
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadForm(prev => ({ ...prev, files }));
  }, []);

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
            category: uploadForm.category,
            caption: uploadForm.caption || null,
            date_taken: uploadForm.date_taken,
          },
        });

        setUploadProgress(((i + 1) / uploadForm.files.length) * 100);
      }

      setShowUploadModal(false);
      setUploadForm({
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

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setShowLightbox(true);
  };

  const nextPhoto = () => {
    setLightboxIndex((prev) => (prev + 1) % (photos?.length || 1));
  };

  const prevPhoto = () => {
    setLightboxIndex((prev) => (prev - 1 + (photos?.length || 1)) % (photos?.length || 1));
  };

  const photosList = photos || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Photos ({photosList.length})</h3>
        <Button
          size="sm"
          onClick={() => setShowUploadModal(true)}
          leftIcon={<Camera className="h-4 w-4" />}
        >
          Add Photo
        </Button>
      </div>

      {/* Photo Grid */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : photosList.length === 0 ? (
        <Card className="p-8 text-center bg-gray-50">
          <Camera className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 mb-3">No photos yet for {animalName}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowUploadModal(true)}
            leftIcon={<Upload className="h-4 w-4" />}
          >
            Upload First Photo
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {photosList.map((photo, index) => (
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
              
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="h-6 w-6 text-white" />
                </div>
              </div>

              <div className="absolute bottom-1 left-1">
                <Badge 
                  variant={
                    ['health', 'injury', 'predation'].includes(photo.category) ? 'danger' : 'default'
                  }
                  className="text-xs px-1 py-0"
                >
                  {PHOTO_CATEGORIES.find(c => c.value === photo.category)?.label || photo.category}
                </Badge>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this photo?')) {
                    deleteMutation.mutate(photo);
                  }
                }}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        open={showUploadModal}
        onClose={() => !isUploading && setShowUploadModal(false)}
        title={`Add Photos - ${animalName}`}
      >
        <form onSubmit={handleUpload} className="space-y-4">
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
                    <p className="text-sm text-gray-500">Click to change</p>
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
            >
              {isUploading ? 'Uploading...' : `Upload ${uploadForm.files.length || ''} Photo${uploadForm.files.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Lightbox */}
      {showLightbox && photosList.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 z-10"
          >
            <X className="h-8 w-8" />
          </button>

          {photosList.length > 1 && (
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

          <img
            src={photosList[lightboxIndex].url}
            alt={photosList[lightboxIndex].caption || 'Photo'}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />

          <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white p-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div>
                <p className="font-medium">{animalName}</p>
                {photosList[lightboxIndex].caption && (
                  <p className="text-gray-300 text-sm">{photosList[lightboxIndex].caption}</p>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>{formatDate(photosList[lightboxIndex].date_taken)}</span>
                <Badge variant="default" className="bg-white/20">
                  {PHOTO_CATEGORIES.find(c => c.value === photosList[lightboxIndex].category)?.label}
                </Badge>
                <span>{lightboxIndex + 1} / {photosList.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
