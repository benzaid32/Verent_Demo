import React, { useState } from 'react';
import { CheckCircle2, Loader2, Save, X } from 'lucide-react';
import type { UpdateListingRequest } from '../shared/contracts';
import type { Listing } from '../types';
import OnChainProofCard from './OnChainProofCard';

interface EditListingModalProps {
  listing: Listing;
  onClose: () => void;
  onSave: (payload: UpdateListingRequest) => Promise<Listing>;
}

const CATEGORY_OPTIONS: UpdateListingRequest['category'][] = ['Camera', 'Drone', 'Lighting', 'Compute', 'Audio', 'Event', 'Other'];

const EditListingModal: React.FC<EditListingModalProps> = ({ listing, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: listing.title,
    category: listing.category,
    productType: listing.productType || '',
    description: listing.description,
    location: listing.location,
    specs: listing.specs.join(', '),
    dailyRateUsdc: String(listing.dailyRateUsdc)
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [updatedListing, setUpdatedListing] = useState<Listing | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async () => {
    const normalizedProductType = formData.productType.trim();
    const normalizedTitle = formData.title.trim();
    const normalizedDescription = formData.description.trim();
    const normalizedLocation = formData.location.trim();
    const normalizedSpecs = formData.specs.split(',').map((item) => item.trim()).filter(Boolean);
    const normalizedDailyRate = Number(formData.dailyRateUsdc);

    if (!normalizedTitle || !normalizedDescription || !normalizedLocation) {
      setError('Title, description, and location are required.');
      return;
    }
    if (!Number.isFinite(normalizedDailyRate) || normalizedDailyRate <= 0) {
      setError('Enter a valid daily price greater than zero.');
      return;
    }
    if (formData.category === 'Other' && !normalizedProductType) {
      setError('Custom listings need a product type.');
      return;
    }

    const nothingChanged =
      normalizedTitle === listing.title &&
      formData.category === listing.category &&
      (normalizedProductType || '') === (listing.productType || '') &&
      normalizedDescription === listing.description &&
      normalizedLocation === listing.location &&
      normalizedDailyRate === listing.dailyRateUsdc &&
      normalizedSpecs.join('|') === listing.specs.join('|');

    if (nothingChanged) {
      setError('No changes detected. Update a field before saving.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const nextListing = await onSave({
        title: normalizedTitle,
        category: formData.category,
        productType: normalizedProductType || undefined,
        description: normalizedDescription,
        location: normalizedLocation,
        specs: normalizedSpecs,
        dailyRateUsdc: normalizedDailyRate
      });
      setUpdatedListing(nextListing);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to update listing.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit Details & Price</h2>
            <p className="text-xs text-gray-500">Save real listing updates on Solana and in Verent.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" disabled={isSaving}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {updatedListing ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-gray-900">Listing Updated On-Chain</h3>
              <p className="mx-auto mb-8 max-w-md text-sm text-gray-500">
                Your latest edit was confirmed on Solana and the proof below now reflects the new listing update transaction.
              </p>
              <div className="w-full max-w-xl text-left">
                <OnChainProofCard
                  signature={updatedListing.confirmedSignature}
                  programId={updatedListing.programId}
                  accountLabel="Listing PDA"
                  accountValue={updatedListing.listingPda}
                  confirmedSlot={updatedListing.confirmedSlot}
                  cluster={updatedListing.chainCluster}
                  protocolVersion={updatedListing.protocolVersion}
                />
              </div>
            </div>
          ) : (
            <>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">Equipment Title</label>
            <input name="title" value={formData.title} onChange={handleChange} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all focus:border-verent-green focus:bg-white focus:ring-2 focus:ring-verent-green/20" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">Category</label>
              <select name="category" value={formData.category} onChange={handleChange} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all focus:border-verent-green focus:bg-white focus:ring-2 focus:ring-verent-green/20">
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">Product Type</label>
              <input name="productType" value={formData.productType} onChange={handleChange} placeholder="e.g. PA Speaker, Projector, GPU Server" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all focus:border-verent-green focus:bg-white focus:ring-2 focus:ring-verent-green/20" />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all focus:border-verent-green focus:bg-white focus:ring-2 focus:ring-verent-green/20" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">Location</label>
              <input name="location" value={formData.location} onChange={handleChange} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all focus:border-verent-green focus:bg-white focus:ring-2 focus:ring-verent-green/20" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">Daily Rate (USDC)</label>
              <input name="dailyRateUsdc" type="number" min="0" step="0.01" value={formData.dailyRateUsdc} onChange={handleChange} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono outline-none transition-all focus:border-verent-green focus:bg-white focus:ring-2 focus:ring-verent-green/20" />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">Key Specs</label>
            <input name="specs" value={formData.specs} onChange={handleChange} placeholder="Comma separated specs" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all focus:border-verent-green focus:bg-white focus:ring-2 focus:ring-verent-green/20" />
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            Saving will request a real wallet signature and update the listing metadata hash plus price on Solana devnet.
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
            </>
          )}
        </div>

        <div className="flex justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4">
          {updatedListing ? (
            <div className="flex w-full justify-end">
              <button onClick={onClose} className="rounded-xl bg-black px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-gray-800">
                Close
              </button>
            </div>
          ) : (
            <>
              <button onClick={onClose} disabled={isSaving} className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={() => void handleSubmit()} disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-gray-800 disabled:cursor-wait disabled:opacity-60">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>{isSaving ? 'Updating On-Chain...' : 'Save Changes'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditListingModal;
