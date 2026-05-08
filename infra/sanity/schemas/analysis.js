export default {
  name: 'analysis',
  title: 'Analysis',
  type: 'document',
  fields: [
    { name: 'analysisId', title: 'Analysis ID', type: 'string' },
    { name: 'documentId', title: 'Document ID', type: 'string' },
    { name: 'riskScore', title: 'Risk Score', type: 'number' },
    { name: 'flags', title: 'Flags', type: 'array', of: [{ type: 'object', fields: [
      { name: 'clauseId', type: 'string' },
      { name: 'reason', type: 'string' },
      { name: 'confidence', type: 'number' },
      { name: 'scoreContribution', type: 'number' },
      { name: 'evidence', type: 'array', of: [{ type: 'string' }] }
    ] }] },
    { name: 'clauseCount', title: 'Clause Count', type: 'number' },
    { name: 'promptVersion', title: 'Prompt Version', type: 'string' },
    { name: 'modelVersion', title: 'Model Version', type: 'string' },
    { name: 'createdAt', title: 'Created At', type: 'datetime' }
  ]
}
