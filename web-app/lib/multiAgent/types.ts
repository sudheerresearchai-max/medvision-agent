/**
 * MedVision Multi-Agent AI System — Agent Roles & Message Protocol.
 * 
 * Defines the 5 specialized clinical AI agents collaborating to solve
 * multi-modal oncology diagnostic and segmentation tasks.
 */

export type AgentRole =
  | 'triage_agent'
  | 'clinical_nlp_agent'
  | 'radiologist_vision_agent'
  | 'biomarker_agent'
  | 'synthesis_scribe_agent';

export interface SpecializedAgentMeta {
  role: AgentRole;
  name: string;
  title: string;
  specialty: string;
  avatarIcon: string;
  color: string;
  systemPrompt: string;
}

export interface AgentThoughtTrace {
  id: string;
  role: AgentRole;
  timestamp: string;
  thought: string;
  toolInvoked?: string;
  actionTaken: string;
  confidenceScore: number;
  outputSummary: string;
  status: 'active' | 'completed' | 'verified';
}

export interface AgentHandoffMessage {
  fromRole: AgentRole;
  toRole: AgentRole;
  timestamp: string;
  payloadSummary: string;
  dataKeysPassed: string[];
}

export interface MultiAgentSessionTrace {
  sessionId: string;
  consensusScore: number;
  totalLatencyMs: number;
  agentsInvolved: AgentRole[];
  thoughts: AgentThoughtTrace[];
  handoffs: AgentHandoffMessage[];
  finalConsensusSummary: string;
}

export const MULTI_AGENT_PROFILES: Record<AgentRole, SpecializedAgentMeta> = {
  triage_agent: {
    role: 'triage_agent',
    name: 'Dr. Triage AI',
    title: 'Multimodal Ingestion & Document Specialist',
    specialty: 'Radiographic Format Sniffing & Optical Parsing',
    avatarIcon: 'FileCheck',
    color: '#3b82f6',
    systemPrompt:
      'You are the Ingestion & Triage Agent. Validate scan byte signatures (PNG/JPG/DICOM/NIfTI), verify spatial dimensions, and parse unstructured clinical referral PDFs.',
  },
  clinical_nlp_agent: {
    role: 'clinical_nlp_agent',
    name: 'Dr. Lexicon AI',
    title: 'Clinical NLP & Medical Reasoning Agent',
    specialty: 'Biomedical NER & Anatomical Hypotheses',
    avatarIcon: 'Stethoscope',
    color: '#8b5cf6',
    systemPrompt:
      'You are the Clinical NLP & Reasoning Agent. Extract clinical entities (symptoms, patient demographics, laterality, suspected conditions) and formulate target anatomical routing hypotheses.',
  },
  radiologist_vision_agent: {
    role: 'radiologist_vision_agent',
    name: 'Dr. Vision AI',
    title: 'Senior Computational Radiologist',
    specialty: 'Deep Neural U-Net Lesion Segmentation',
    avatarIcon: 'Scan',
    color: '#06b6d4',
    systemPrompt:
      'You are the Radiologist Vision Specialist. Select and dispatch the appropriate organ-specific deep neural U-Net model, process 2D slice tensors, and delineate tumor boundary contours.',
  },
  biomarker_agent: {
    role: 'biomarker_agent',
    name: 'Dr. Metric AI',
    title: 'Quantitative Biomarker & RECIST Specialist',
    specialty: 'RECIST 1.1 Morphometry & Volumetric Modeling',
    avatarIcon: 'Ruler',
    color: '#10b981',
    systemPrompt:
      'You are the Quantitative Biomarker Agent. Compute RECIST 1.1 longest diameter, orthogonal short axis, circularity index, and estimated 3-D tumor burden volume.',
  },
  synthesis_scribe_agent: {
    role: 'synthesis_scribe_agent',
    name: 'Chief Scribe AI',
    title: 'Synthesis & Quality Assurance Scribe',
    specialty: 'Multi-Agent Consensus & Clinical Reporting',
    avatarIcon: 'FileText',
    color: '#f59e0b',
    systemPrompt:
      'You are the Synthesis Scribe Agent. Verify inter-agent consensus, validate diagnostic coherence across clinical history and segmentation masks, and compile the final structured radiology report.',
  },
};
