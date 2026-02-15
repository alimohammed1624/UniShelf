import { Resource } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ResourceTableCardProps {
  resources: Resource[];
  loading: boolean;
  onDownload: (id: number, title: string) => void;
}

export function ResourceTableCard({
  resources,
  loading,
  onDownload,
}: ResourceTableCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Resources</CardTitle>
        <CardDescription>
          {loading ? 'Loading resources...' : `${resources.length} resources available`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {resources.length === 0 ? (
          <p className="text-sm text-muted-foreground">No resources found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Uploader</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell className="font-medium">{resource.title}</TableCell>
                  <TableCell className="max-w-xs truncate">{resource.description}</TableCell>
                  <TableCell>User #{resource.uploader_id}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => onDownload(resource.id, resource.title)}>
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
