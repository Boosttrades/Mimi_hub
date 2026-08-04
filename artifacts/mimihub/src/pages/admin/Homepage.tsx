import { AdminLayout } from './AdminLayout';
import { useGetHomepageSettings, useUpdateHomepageSettings, getGetHomepageSettingsQueryKey } from '@workspace/api-client-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

export function AdminHomepage() {
  const { data: settings, isLoading } = useGetHomepageSettings();
  const updateSettings = useUpdateHomepageSettings();
  const queryClient = useQueryClient();

  // Basic implementation to avoid complexity - in a real app, forms would manage arrays
  const handleSave = () => {
    updateSettings.mutate({ data: settings! }, {
      onSuccess: () => {
        toast.success('Homepage settings saved');
        queryClient.invalidateQueries({ queryKey: getGetHomepageSettingsQueryKey() });
      }
    });
  };

  if (isLoading) return <AdminLayout title="Homepage Content"><LoadingSpinner size="lg" /></AdminLayout>;

  return (
    <AdminLayout title="Homepage Content">
      <div className="max-w-3xl space-y-8">
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <p className="text-muted-foreground mb-4">
            Complex array management for Hero Banners, Collections, and Trust Items would go here.
            Currently stubbed for layout structure.
          </p>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </AdminLayout>
  );
}
