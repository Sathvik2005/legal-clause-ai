export default {
  name: 'legalDocument',
  title: 'Legal Document',
  type: 'document',
  fields: [
    { name: 'docId', title: 'Document ID', type: 'string' },
    { name: 'title', title: 'Title', type: 'string' },
    { name: 'originalName', title: 'Original Filename', type: 'string' },
    { name: 'mimeType', title: 'MIME Type', type: 'string' },
    { name: 'filePath', title: 'File Path', type: 'string' },
    { name: 'textPath', title: 'Extracted Text Path', type: 'string' },
    { name: 'status', title: 'Status', type: 'string' },
    { name: 'createdAt', title: 'Created At', type: 'datetime' }
  ]
}
