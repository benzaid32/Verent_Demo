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
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-gray-100 px-6 py-5 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">{description}</p>
        </div>

        <div className="space-y-6 p-6">
          <OnChainProofCard
            signature={signature}
            programId={programId}
            accountLabel={accountLabel}
            accountValue={accountValue}
            confirmedSlot={confirmedSlot}
            cluster={cluster}
            protocolVersion={protocolVersion}
          />
        </div>

        <div className="border-t border-gray-100 bg-gray-50/60 px-6 py-4">
          <button onClick={onClose} className="w-full rounded-xl bg-black px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-gray-800">
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionSuccessDialog;
