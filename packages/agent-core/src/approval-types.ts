export type ApprovalDecision = 'approved' | 'rejected';

export type PendingApproval = {
  approvalId: string;
  kind: 'write_file' | 'run_command';
  summary: string;
};
