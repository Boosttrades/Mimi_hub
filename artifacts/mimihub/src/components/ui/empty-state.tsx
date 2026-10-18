import { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
      <div className="text-primary mb-6 flex items-center justify-center p-4 bg-primary/10 rounded-full">
        {icon}
      </div>
      <h3 className="font-serif text-2xl text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground max-w-md mb-8">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
