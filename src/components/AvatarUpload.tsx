import { useState } from 'react';
import { Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-9 w-9',
  md: 'h-14 w-14',
  lg: 'h-20 w-20',
};

const iconSizes = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const textSizes = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
};

export default function AvatarUpload({ size = 'md', className = '' }: Props) {
  const { user, profile, profileId, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id || !profileId) return;

    if (!/\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
      toast.error('Yalnızca JPG, PNG veya WebP yükleyebilirsiniz.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB\'dan küçük olmalı.');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error('Yükleme hatası: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const avatarUrl = urlData.publicUrl + '?t=' + Date.now();

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', profileId);

    if (updateError) {
      toast.error('Profil güncellenemedi.');
    } else {
      toast.success('Profil fotoğrafı güncellendi!');
      await refreshProfile();
    }
    setUploading(false);
    // Reset input
    e.target.value = '';
  };

  return (
    <label className={`relative cursor-pointer group ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-orange flex items-center justify-center shadow-orange overflow-hidden ring-2 ring-primary/30 ${uploading ? 'opacity-60' : ''}`}>
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <span className={`font-display font-bold text-primary-foreground ${textSizes[size]}`}>
            {profile?.full_name?.charAt(0) || '?'}
          </span>
        )}
      </div>
      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Camera className={`${iconSizes[size]} text-white`} />
      </div>
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={handleUpload}
        className="hidden"
        disabled={uploading}
      />
    </label>
  );
}
