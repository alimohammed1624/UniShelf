import type { Resource } from '@/types';

export interface ResourceCategory {
  id: string;
  label: string;
}

// Order doubles as filter chip order. 'code' is the catch-all bucket, so it
// must be checked last in matchesCategory below.
export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  { id: 'documents', label: 'Documents' },
  { id: 'media', label: 'Media' },
  { id: 'links', label: 'Links' },
  { id: 'archives', label: 'Archive' },
  { id: 'code', label: 'Code' },
  { id: 'directory', label: 'Folder' },
];

const DOCUMENT_MIME_PREFIXES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml',
  'application/rtf',
  'text/rtf',
  'application/epub+zip',
  'text/csv',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
  'application/x-mobipocket-ebook',
];
const DOCUMENT_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'rtf', 'epub', 'csv', 'odt', 'ods', 'odp', 'mobi',
];

const MEDIA_MIME_PREFIXES = ['audio/', 'video/', 'image/'];

const ARCHIVE_MIME_PREFIXES = [
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',
  'application/x-gzip',
  'application/x-xz',
];
const ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz'];

function extensionOf(filename: string | null): string {
  if (!filename) return '';
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function matchesMimeOrExtension(
  resource: Resource,
  mimePrefixes: string[],
  extensions: string[],
): boolean {
  const type = resource.type ?? '';
  if (mimePrefixes.some((prefix) => type.startsWith(prefix))) return true;
  return extensions.includes(extensionOf(resource.filename));
}

// A resource always matches exactly one category: 'code' is the catch-all
// for anything (text files, source code, json, unrecognized types) that
// isn't a directory, link, document, media file, or archive.
export function getResourceCategory(resource: Resource): string {
  if (resource.type === 'directory') return 'directory';
  if (resource.type === 'link') return 'links';
  if (matchesMimeOrExtension(resource, ARCHIVE_MIME_PREFIXES, ARCHIVE_EXTENSIONS)) return 'archives';
  if (matchesMimeOrExtension(resource, DOCUMENT_MIME_PREFIXES, DOCUMENT_EXTENSIONS)) return 'documents';
  if (MEDIA_MIME_PREFIXES.some((prefix) => resource.type?.startsWith(prefix))) return 'media';
  return 'code';
}

export function matchesResourceCategory(resource: Resource, categoryId: string): boolean {
  return getResourceCategory(resource) === categoryId;
}
