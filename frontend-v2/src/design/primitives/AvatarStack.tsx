import React from 'react';

interface Avatar {
  id: string;
  name: string;
  avatar?: string;
  initials?: string;
}

interface AvatarStackProps {
  avatars: Avatar[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AvatarStack: React.FC<AvatarStackProps> = ({ 
  avatars, 
  max = 3, 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base'
  };

  const displayAvatars = avatars.slice(0, max);
  const remainingCount = Math.max(0, avatars.length - max);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`flex items-center -space-x-2 ${className}`}>
      {displayAvatars.map((avatar) => (
        <div
          key={avatar.id}
          className={`${sizeClasses[size]} rounded-full bg-surface-secondary border-2 border-surface-primary flex items-center justify-center text-text-secondary font-medium`}
          title={avatar.name}
        >
          {avatar.avatar ? (
            <img 
              src={avatar.avatar} 
              alt={avatar.name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span>{avatar.initials || getInitials(avatar.name)}</span>
          )}
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div 
          className={`${sizeClasses[size]} rounded-full bg-surface-tertiary border-2 border-surface-primary flex items-center justify-center text-text-tertiary font-medium`}
          title={`${remainingCount} pessoas adicionais`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};
