import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface RincianTemplateDisplayProps {
  template: string;
  className?: string;
}

export function RincianTemplateDisplay({ template, className = '' }: RincianTemplateDisplayProps) {
  if (!template) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Rincian Tagihan
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm p-3 sm:p-4 bg-muted/50 rounded-lg overflow-x-auto leading-relaxed">
          {template}
        </pre>
      </CardContent>
    </Card>
  );
}
