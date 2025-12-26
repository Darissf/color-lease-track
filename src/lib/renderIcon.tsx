import React from 'react';

interface RenderIconOptions {
  icon: string | null | undefined;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-12 h-12',
};

const textSizes = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-4xl',
};

/**
 * PENTING: Gunakan fungsi ini untuk render icon client/user.
 * Fungsi ini akan mendeteksi apakah icon adalah URL gambar atau emoji.
 * JANGAN render icon langsung sebagai text!
 * 
 * @example
 * // Untuk icon client
 * {renderIcon({ icon: client.icon, alt: client.nama, size: 'lg' })}
 * 
 * // Untuk icon user
 * {renderIcon({ icon: user.avatar, alt: user.name, size: 'md', fallback: '👤' })}
 */
export function renderIcon({
  icon,
  alt = '',
  size = 'md',
  fallback = '👤',
  className = '',
}: RenderIconOptions): React.ReactNode {
  if (!icon) {
    return <span className={`${textSizes[size]} ${className}`}>{fallback}</span>;
  }

  // Jika icon adalah URL (Supabase storage, HTTP, atau data URI)
  const isUrl = icon.startsWith('http://') || 
                icon.startsWith('https://') || 
                icon.startsWith('data:') ||
                icon.startsWith('blob:');

  if (isUrl) {
    return (
      <img
        src={icon}
        alt={alt}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        onError={(e) => {
          // Fallback jika gambar gagal load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.parentElement?.insertAdjacentHTML('afterbegin', `<span class="${textSizes[size]} ${className}">${fallback}</span>`);
        }}
      />
    );
  }

  // Jika icon adalah emoji atau text
  return <span className={`${textSizes[size]} ${className}`}>{icon}</span>;
}
