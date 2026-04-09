import React, { useMemo, useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, FileCode2, Hash, Layers3 } from 'lucide-react';
import { buildSolanaExplorerTxUrl } from '../shared/protocol';

interface OnChainProofCardProps {
  signature?: string;
  programId?: string;
  accountLabel?: string;
  accountValue?: string;
  confirmedSlot?: number;
  cluster?: string;
  protocolVersion?: string;
  compact?: boolean;
}

function shorten(value: string, start = 6, end = 6) {
  if (value.length <= start + end + 3) {
    return value;
  }
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

const OnChainProofCard: React.FC<OnChainProofCardProps> = ({
  signature,
  programId,
  accountLabel = 'Account',
  accountValue,
  confirmedSlot,
  cluster,
  protocolVersion,
  compact = false
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const explorerUrl = useMemo(() => {
    if (!signature) {
      return undefined;
    }
    return buildSolanaExplorerTxUrl(signature, cluster || 'devnet');
  }, [cluster, signature]);

  if (!signature && !programId && !accountValue) {
    return null;
  }

  const copyValue = async (label: string, value?: string) => {
    if (!value) {
      return;
    }
    await navigator.clipboard.writeText(value);
    setCopiedField(label);
    window.setTimeout(() => setCopiedField((current) => (current === label ? null : current)), 1500);
  };

  const renderField = (label: string, value: string | number | undefined, icon: React.ReactNode, monospace = true) => {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const stringValue = String(value);

    return (
      <div className={`rounded-xl border border-gray-200 bg-gray-50/60 ${compact ? 'p-3' : 'p-4'}`}>
        <div className={`flex items-center justify-between gap-3 ${compact ? 'mb-1.5' : 'mb-2'}`}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {icon}
            <span>{label}</span>
          </div>
          {typeof value === 'string' && (
            <button
              type="button"
              onClick={() => void copyValue(label, stringValue)}
              className={`inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white font-medium text-gray-600 hover:text-gray-900 ${compact ? 'px-2 py-1 text-[10px]' : 'px-2 py-1 text-[11px]'}`}
            >
              <Copy className="h-3 w-3" />
              <span>{copiedField === label ? 'Copied' : 'Copy'}</span>
            </button>
          )}
        </div>
        <div className={`break-all text-gray-900 ${monospace ? 'font-mono' : ''} ${compact ? 'text-[13px]' : 'text-sm'}`}>
          {stringValue}
        </div>
      </div>
    );
  };

  return (
    <section className={`rounded-2xl border border-emerald-100 bg-white shadow-sm ${compact ? 'p-4' : 'p-6'}`}>
      <div className={`flex flex-wrap items-center justify-between gap-3 ${compact ? 'mb-4' : 'mb-5'}`}>
        <div>
          <div className={`inline-flex items-center gap-2 rounded-full bg-emerald-50 font-semibold text-emerald-700 ${compact ? 'mb-1.5 px-2.5 py-1 text-[11px]' : 'mb-2 px-3 py-1 text-xs'}`}>
            <CheckCircle2 className="h-4 w-4" />
            <span>Confirmed On Solana</span>
          </div>
          <h3 className={`font-bold text-gray-900 ${compact ? 'text-base' : 'text-lg'}`}>On-Chain Proof</h3>
        </div>
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white font-medium text-gray-700 hover:text-gray-900 ${compact ? 'px-3 py-2 text-xs' : 'px-3 py-2 text-sm'}`}
          >
            <span>View on Explorer</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className={`flex flex-wrap gap-2 text-xs ${compact ? 'mb-3' : 'mb-4'}`}>
        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 font-medium text-gray-600">
          Cluster: {cluster || 'devnet'}
        </span>
        {protocolVersion && (
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 font-medium text-gray-600">
            Protocol v{protocolVersion}
          </span>
        )}
        {confirmedSlot !== undefined && (
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 font-medium text-gray-600">
            Slot {confirmedSlot}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {renderField('Transaction Signature', signature, <Hash className="h-3.5 w-3.5" />)}
        {renderField(accountLabel, accountValue, <Layers3 className="h-3.5 w-3.5" />)}
        {renderField('Program ID', programId, <FileCode2 className="h-3.5 w-3.5" />)}
      </div>

      <p className={`text-xs text-gray-500 ${compact ? 'mt-3' : 'mt-4'}`}>
        Proof links and identifiers are pulled from the confirmed transaction and persisted listing metadata.
      </p>
    </section>
  );
};

export function formatOnChainShortId(value?: string) {
  return value ? shorten(value) : undefined;
}

export default OnChainProofCard;
