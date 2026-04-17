import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import OnChainProofCard from './OnChainProofCard';

interface TransactionSuccessDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  onClose: () => void;
  closeLabel?: string;
  signature?: string;
  programId?: string;
  accountLabel?: string;
  accountValue?: string;
  confirmedSlot?: number;
  cluster?: string;
  protocolVersion?: string;
}

const TransactionSuccessDialog: React.FC<TransactionSuccessDialogProps> = ({
  isOpen,
  title,
  description,
  onClose,
  closeLabel = 'Close',
  signature,
  programId,
  accountLabel,
  accountValue,
  confirmedSlot,
  cluster,
  protocolVersion
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-gray-100 px-4 py-5 text-center sm:px-6 sm:py-6">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-verent-yellow/25 sm:h-16 sm:w-16">
            <CheckCircle2 className="h-7 w-7 text-verent-yellow-dark sm:h-8 sm:w-8" />
          </div>
          <div className="mx-auto max-w-lg">
            <h3 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{title}</h3>
            <p className="mx-auto mt-2 text-sm leading-6 text-gray-500">{description}</p>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
          <div className="rounded-2xl border border-verent-yellow/30 bg-verent-peach p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-verent-yellow-dark">Status</p>
            <p className="mt-2 text-sm font-medium text-verent-black">Transaction confirmed successfully.</p>
            <p className="mt-1 text-xs leading-5 text-gray-700">Transaction details are shown below for verification.</p>
          </div>
          <OnChainProofCard
            signature={signature}
            programId={programId}
            accountLabel={accountLabel}
            accountValue={accountValue}
            confirmedSlot={confirmedSlot}
            cluster={cluster}
            protocolVersion={protocolVersion}
            compact
          />
        </div>

        <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-4 sm:px-6">
          <button onClick={onClose} className="w-full rounded-xl bg-verent-yellow px-5 py-3 text-sm font-bold text-verent-black transition-colors hover:bg-verent-yellow-dark">
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionSuccessDialog;
