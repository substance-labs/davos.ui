import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface DaoHeaderProps {
  space: {
    id: string;
    name: string;
  };
  className?: string;
}

export function DaoHeader({ space, className }: DaoHeaderProps) {
  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={`https://cdn.stamp.fyi/avatar/${space.id}?s=164`} alt={space.name} />
        <AvatarFallback>{space.name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <h3 className="font-semibold">{space.name}</h3>
    </div>
  );
}
