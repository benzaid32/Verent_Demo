
import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Scan, ArrowRight, Clock, CheckCircle2, Plus, ExternalLink, MessageSquare } from 'lucide-react';
import AddListingModal from './AddListingModal';
import TransactionSuccessDialog from './TransactionSuccessDialog';
import type { CreateListingRequest } from '../shared/contracts';
import type { Listing, Rental } from '../types';

interface UnifiedDashboardProps {
  initialTab?: 'renting' | 'lending';
  rentingRentals: Rental[];
  lendingRentals: Rental[];
  onAcceptRental: (rentalId: string) => Promise<Rental>;
  onConfirmPickup: (rentalId: string, code: string) => Promise<Rental>;
  onCompleteRental: (rentalId: string, code: string) => Promise<Rental>;
  onCreateListing: (payload: CreateListingRequest) => Promise<Listing>;
  onMessageOwner: (listingId: string) => Promise<void>;
}

type RentalModalState =
  | { type: 'pickup_qr' | 'return_qr'; rental: Rental }
  | { type: 'confirm_pickup' | 'confirm_return'; rental: Rental }
  | null;

type RentalSuccessState = {
  title: string;
  description: string;
  rental: Rental;
} | null;

const UnifiedDashboard: React.FC<UnifiedDashboardProps> = ({
  initialTab = 'renting',
  rentingRentals,
  lendingRentals,
  onAcceptRental,
  onConfirmPickup,
  onCompleteRental,
  onCreateListing,
  onMessageOwner
}) => {
  const [activeTab, setActiveTab] = useState<'renting' | 'lending'>(initialTab);
  const [modalState, setModalState] = useState<RentalModalState>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [actionError, setActionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successState, setSuccessState] = useState<RentalSuccessState>(null);

  const rentals = activeTab === 'renting' ? rentingRentals : lendingRentals;

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!modalState || (modalState.type !== 'pickup_qr' && modalState.type !== 'return_qr')) {
      setQrDataUrl('');
      return;
    }

    const code = modalState.type === 'pickup_qr' ? modalState.rental.pickupCode : modalState.rental.returnCode;
    if (!code) {
      setQrDataUrl('');
      return;
    }

    void QRCode.toDataURL(JSON.stringify({
      rentalId: modalState.rental.id,
      code,
      kind: modalState.type === 'pickup_qr' ? 'pickup' : 'return'
    }), {
      margin: 1,
      width: 224,
      color: {
        dark: '#111827',
        light: '#FFFFFF'
      }
    }).then(setQrDataUrl).catch(() => setQrDataUrl(''));
  }, [modalState]);

  const stats = useMemo(() => {
    const allRentals = [...rentingRentals, ...lendingRentals];
    return {
      active: allRentals.filter((item) => item.status === 'active').length,
      completed: allRentals.filter((item) => item.status === 'completed').length,
      pendingHandshake: allRentals.filter((item) => item.status === 'pending_approval' || item.status === 'pending_pickup').length
    };
  }, [lendingRentals, rentingRentals]);

  const handleListingAdded = async (payload: CreateListingRequest) => {
    return onCreateListing(payload);
  };

  const closeModal = () => {
    setModalState(null);
    setVerificationCode('');
    setActionError('');
    setIsSubmitting(false);
  };

  const showSuccessState = (title: string, description: string, rental: Rental) => {
    setSuccessState({ title, description, rental });
  };

  const submitVerification = async () => {
    if (!modalState || (modalState.type !== 'confirm_pickup' && modalState.type !== 'confirm_return')) {
      return;
    }
    if (!verificationCode.trim()) {
      setActionError('Enter the code shown by the renter.');
      return;
    }

    setIsSubmitting(true);
    setActionError('');
    try {
      if (modalState.type === 'confirm_pickup') {
        const rental = await onConfirmPickup(modalState.rental.id, verificationCode.trim().toUpperCase());
        closeModal();
        showSuccessState(
          'Pickup Confirmed On-Chain',
          'The handoff has been verified on Solana and this rental is now active with fresh protocol proof.',
          rental
        );
      } else {
        const rental = await onCompleteRental(modalState.rental.id, verificationCode.trim().toUpperCase());
        closeModal();
        showSuccessState(
          'Return Settled On-Chain',
          'Return confirmation and escrow settlement were both finalized on Solana for this rental.',
          rental
        );
      }
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : 'Failed to verify rental code.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in duration-500 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Command Center</h1>
                <p className="text-gray-500 text-sm mt-1">Manage your infrastructure rentals and fleet status.</p>
            </div>
            
            <div className="flex items-center space-x-4">
                <div className="bg-gray-100 p-1 rounded-lg inline-flex">
                    <button 
                        onClick={() => setActiveTab('renting')}
                        className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'renting' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Renting
                    </button>
                    <button 
                        onClick={() => setActiveTab('lending')}
                        className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'lending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Lending
                    </button>
                </div>
                
                {/* ADD NEW ITEM CTA - Only visible in Lending Mode */}
                {activeTab === 'lending' && (
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="hidden md:flex items-center space-x-2 bg-black text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-all shadow-md hover:shadow-lg shadow-gray-200"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-medium">Add Item</span>
                    </button>
                )}
            </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900">{stats.active}</span>
                </div>
                <p className="text-sm font-medium text-gray-900">Active Rentals</p>
                <p className="text-xs text-gray-500">Live across renting and lending</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                     <div className="p-2 bg-green-50 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900">{stats.completed}</span>
                </div>
                <p className="text-sm font-medium text-gray-900">Completed</p>
                <p className="text-xs text-gray-500">Persisted rental history</p>
            </div>
             <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                     <div className="p-2 bg-orange-50 rounded-lg">
                        <Scan className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900">{stats.pendingHandshake}</span>
                </div>
                <p className="text-sm font-medium text-gray-900">Pending Handshake</p>
                <p className="text-xs text-gray-500">Awaiting approval or code verification</p>
            </div>
        </div>

        {/* List Section */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">{activeTab === 'renting' ? 'My Active Rentals' : 'Fleet Requests'}</h3>
                
                {/* Mobile Add Button */}
                {activeTab === 'lending' && (
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="md:hidden flex items-center space-x-1 text-xs font-medium text-black bg-white border border-gray-200 px-3 py-1.5 rounded-lg"
                    >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                    </button>
                )}
            </div>
            
            <div className="divide-y divide-gray-50">
                {rentals.map((rental) => (
                    <div key={rental.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center space-x-4">
                            <img src={rental.thumbnail} alt="" className="w-16 h-16 rounded-lg object-cover bg-gray-200" />
                            <div>
                                <h4 className="font-bold text-gray-900">{rental.itemTitle}</h4>
                                <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                                    <span>{rental.startDate}</span>
                                    <ArrowRight className="w-3 h-3" />
                                    <span>{rental.endDate}</span>
                                </div>
                                <div className="mt-2 flex items-center space-x-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                                        rental.status === 'active' ? 'bg-green-100 text-green-700' :
                                        rental.status === 'pending_pickup' ? 'bg-orange-100 text-orange-700' :
                                        rental.status === 'pending_approval' ? 'bg-blue-100 text-blue-700' :
                                        rental.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {rental.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs text-gray-400 font-mono">${rental.totalCost}</span>
                                    {rental.explorerUrl && (
                                      <a href={rental.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs text-gray-400 hover:text-gray-600">
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action Area */}
                        <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
                            {activeTab === 'renting' && (
                                <button
                                    onClick={() => void onMessageOwner(rental.itemId)}
                                    className="flex items-center space-x-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    <span>Message Owner</span>
                                </button>
                            )}
                            {activeTab === 'renting' && rental.status === 'pending_pickup' && (
                                <button 
                                    onClick={() => setModalState({ type: 'pickup_qr', rental })}
                                    className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                                >
                                    <QrCode className="w-4 h-4" />
                                    <span>Show Pickup QR</span>
                                </button>
                            )}
                            {activeTab === 'renting' && rental.status === 'active' && (
                                <button 
                                    onClick={() => setModalState({ type: 'return_qr', rental })}
                                    className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                                >
                                    <QrCode className="w-4 h-4" />
                                    <span>Show Return QR</span>
                                </button>
                            )}
                            {activeTab === 'lending' && rental.status === 'pending_approval' && (
                                <button
                                    onClick={async () => {
                                      const nextRental = await onAcceptRental(rental.id);
                                      showSuccessState(
                                        'Escrow Approved On-Chain',
                                        'This booking request is now approved on Solana and the renter can move into pickup verification.',
                                        nextRental
                                      );
                                    }}
                                    className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Approve Escrow</span>
                                </button>
                            )}
                            {activeTab === 'lending' && rental.status === 'pending_pickup' && (
                                <button
                                  onClick={() => setModalState({ type: 'confirm_pickup', rental })}
                                  className="flex items-center space-x-2 bg-verent-green text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
                                >
                                    <Scan className="w-4 h-4" />
                                    <span>Confirm Pickup</span>
                                </button>
                            )}
                            {activeTab === 'lending' && rental.status === 'active' && (
                                <button
                                  onClick={() => setModalState({ type: 'confirm_return', rental })}
                                  className="flex items-center space-x-2 bg-verent-green text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
                                >
                                    <Scan className="w-4 h-4" />
                                    <span>Scan Return QR</span>
                                </button>
                            )}
                             {rental.status === 'active' && (
                                <div className="text-sm text-gray-500 flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span>On-Chain Active</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* QR Modal Overlay */}
        {modalState && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
                <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
                    {modalState.type === 'pickup_qr' || modalState.type === 'return_qr' ? (
                      <>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {modalState.type === 'pickup_qr' ? 'Pickup QR' : 'Return QR'}
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                          {modalState.type === 'pickup_qr'
                            ? 'Show this live rental QR to the owner during handoff.'
                            : 'Show this return QR to the owner when returning the asset.'}
                        </p>
                        <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 inline-block mb-4">
                          {qrDataUrl ? (
                            <img src={qrDataUrl} alt="Rental verification QR" className="w-48 h-48" />
                          ) : (
                            <QrCode className="w-48 h-48 text-gray-900" />
                          )}
                        </div>
                        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-left">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-2">Verification Code</p>
                          <p className="font-mono text-lg font-bold text-gray-900">
                            {modalState.type === 'pickup_qr' ? modalState.rental.pickupCode : modalState.rental.returnCode}
                          </p>
                        </div>
                        <button 
                          onClick={closeModal}
                          className="w-full py-3 bg-gray-100 text-gray-900 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                        >
                          Close
                        </button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {modalState.type === 'confirm_pickup' ? 'Confirm Pickup' : 'Complete Return'}
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                          Enter the code shown by the renter to {modalState.type === 'confirm_pickup' ? 'activate the rental on-chain' : 'confirm the return and settle the escrow on-chain'}.
                        </p>
                        <input
                          value={verificationCode}
                          onChange={(event) => setVerificationCode(event.target.value.toUpperCase())}
                          placeholder="ENTER CODE"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center font-mono text-lg tracking-[0.2em] uppercase outline-none focus:border-verent-green focus:bg-white focus:ring-2 focus:ring-verent-green/20"
                        />
                        {actionError && (
                          <p className="mt-3 text-sm text-red-600">{actionError}</p>
                        )}
                        <div className="mt-6 space-y-3">
                          <button
                            onClick={() => void submitVerification()}
                            disabled={isSubmitting}
                            className="w-full py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-60"
                          >
                            {isSubmitting ? 'Submitting...' : modalState.type === 'confirm_pickup' ? 'Confirm Pickup On-Chain' : 'Settle Return On-Chain'}
                          </button>
                          <button 
                            onClick={closeModal}
                            disabled={isSubmitting}
                            className="w-full py-3 bg-gray-100 text-gray-900 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                </div>
            </div>
        )}

        <TransactionSuccessDialog
          isOpen={Boolean(successState)}
          title={successState?.title || 'Confirmed On-Chain'}
          description={successState?.description || 'This protocol action has been confirmed on Solana.'}
          onClose={() => setSuccessState(null)}
          closeLabel="Back to Dashboard"
          signature={successState?.rental.confirmedSignature || successState?.rental.transactionHash}
          programId={successState?.rental.programId}
          accountLabel="Rental Escrow PDA"
          accountValue={successState?.rental.rentalEscrowPda}
          confirmedSlot={successState?.rental.confirmedSlot}
          cluster={successState?.rental.chainCluster}
          protocolVersion={successState?.rental.protocolVersion}
        />

        {isAddModalOpen && (
            <AddListingModal 
                onClose={() => setIsAddModalOpen(false)} 
                onAdd={handleListingAdded}
            />
        )}
    </div>
  );
};

export default UnifiedDashboard;
