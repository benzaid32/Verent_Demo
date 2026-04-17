
import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Scan, ArrowRight, Clock, CheckCircle2, Plus, ExternalLink, MessageSquare, LayoutDashboard, Boxes, ShieldCheck } from 'lucide-react';
import AddListingModal from './AddListingModal';
import TransactionSuccessDialog from './TransactionSuccessDialog';
import type { CreateListingRequest } from '../shared/contracts';
import type { Listing, Rental } from '../types';

interface UnifiedDashboardProps {
  initialTab?: 'renting' | 'lending';
  primaryRole?: 'renter' | 'owner';
  myListingsCount?: number;
  rentingRentals: Rental[];
  lendingRentals: Rental[];
  onAcceptRental: (rentalId: string) => Promise<Rental>;
  onConfirmPickup: (rentalId: string, code: string) => Promise<Rental>;
  onCompleteRental: (rentalId: string, code: string) => Promise<Rental>;
  onCreateListing: (payload: CreateListingRequest) => Promise<Listing>;
  onMessageOwner: (listingId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
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
  primaryRole = 'renter',
  myListingsCount = 0,
  rentingRentals,
  lendingRentals,
  onAcceptRental,
  onConfirmPickup,
  onCompleteRental,
  onCreateListing,
  onMessageOwner,
  onRefresh
}) => {
  const isRoleLocked = primaryRole === 'owner' || primaryRole === 'renter';
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

  const workspace = useMemo(() => {
    if (activeTab === 'renting') {
      return {
        title: 'Renter Dashboard',
        description: 'Track approvals, pickup, active rentals, and returns.',
        badge: primaryRole === 'renter' ? 'Primary view' : 'Secondary view',
        sectionTitle: 'Your rental timeline',
        sectionDescription: 'Everything you need to do as a renter, from approval to return.',
        emptyTitle: 'No rental activity yet',
        emptyDescription: 'Once you request an asset, approvals, QR handoff steps, and active rental actions will appear here.',
        statCards: [
          {
            label: 'Awaiting Approval',
            value: rentingRentals.filter((item) => item.status === 'pending_approval').length,
            hint: 'Requests waiting for owner approval.',
            icon: <Clock className="w-5 h-5 text-blue-600" />,
            iconWrapperClassName: 'bg-blue-50'
          },
          {
            label: 'Ready For Pickup',
            value: rentingRentals.filter((item) => item.status === 'pending_pickup').length,
            hint: 'Approved rentals that need handoff.',
            icon: <QrCode className="w-5 h-5 text-gray-900" />,
            iconWrapperClassName: 'bg-gray-100'
          },
          {
            label: 'Active Rentals',
            value: rentingRentals.filter((item) => item.status === 'active').length,
            hint: 'Assets currently checked out.',
            icon: <ShieldCheck className="w-5 h-5 text-verent-yellow-dark" />,
            iconWrapperClassName: 'bg-verent-peach'
          }
        ]
      };
    }

    return {
      title: 'Lister Dashboard',
      description: 'Review requests, approve rentals, and manage pickup and return steps.',
      badge: primaryRole === 'owner' ? 'Primary view' : 'Secondary view',
      sectionTitle: 'Listing activity',
      sectionDescription: 'Incoming requests and active rentals for your listed assets.',
      emptyTitle: 'No requests yet',
      emptyDescription: 'When renters request one of your assets, approvals and pickup or return verification steps will appear here.',
      statCards: [
        {
          label: 'Live Listings',
          value: myListingsCount,
          hint: 'Assets currently published on the marketplace.',
          icon: <Boxes className="w-5 h-5 text-gray-900" />,
          iconWrapperClassName: 'bg-gray-100'
        },
        {
          label: 'Needs Approval',
          value: lendingRentals.filter((item) => item.status === 'pending_approval').length,
          hint: 'Booking requests waiting for your approval.',
          icon: <CheckCircle2 className="w-5 h-5 text-blue-600" />,
          iconWrapperClassName: 'bg-blue-50'
        },
        {
          label: 'Open Handoffs',
          value: lendingRentals.filter((item) => item.status === 'pending_pickup' || item.status === 'active').length,
          hint: 'Pickups and returns that still need attention.',
          icon: <Scan className="w-5 h-5 text-orange-600" />,
          iconWrapperClassName: 'bg-orange-50'
        }
      ]
    };
  }, [activeTab, lendingRentals, myListingsCount, primaryRole, rentingRentals]);

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
        await onRefresh();
        closeModal();
        showSuccessState(
          'Pickup Confirmed On-Chain',
          'The pickup was confirmed on Solana and this rental is now active.',
          rental
        );
      } else {
        const rental = await onCompleteRental(modalState.rental.id, verificationCode.trim().toUpperCase());
        await onRefresh();
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
    <div className="relative mx-auto max-w-5xl space-y-6 px-4 py-5 animate-in fade-in duration-500 sm:px-6 sm:py-6 lg:space-y-8">
        <div className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  <LayoutDashboard className="w-3.5 h-3.5 text-verent-green" />
                  <span>Dashboard</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{workspace.title}</h1>
                  <span className="rounded-full border border-verent-green/20 bg-verent-green/[0.06] px-3 py-1 text-xs font-semibold text-verent-green">
                    {workspace.badge}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
                  {workspace.description}
                </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:justify-end">
                {isRoleLocked ? (
                  <div className="inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 sm:w-auto">
                    {primaryRole === 'owner' ? 'Lister dashboard' : 'Renter dashboard'}
                  </div>
                ) : (
                  <div className="inline-flex w-full rounded-xl bg-gray-100 p-1 sm:w-auto">
                      <button 
                          onClick={() => setActiveTab('renting')}
                          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all sm:flex-none sm:px-6 ${activeTab === 'renting' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                          Renter
                      </button>
                      <button 
                          onClick={() => setActiveTab('lending')}
                          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all sm:flex-none sm:px-6 ${activeTab === 'lending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                          Lister
                      </button>
                  </div>
                )}
                
                {activeTab === 'lending' && (
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="hidden md:flex items-center space-x-2 bg-verent-yellow text-verent-black px-4 py-2.5 rounded-lg hover:bg-verent-yellow-dark transition-all shadow-md hover:shadow-lg shadow-verent-yellow/20 font-semibold"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-medium">Add Listing</span>
                    </button>
                )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
              {activeTab === 'renting' ? 'Approvals, pickup, and return steps' : 'Listings, requests, and rental activity'}
            </span>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
              {activeTab === 'renting' ? `${rentingRentals.length} renter records` : `${lendingRentals.length} lister records`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {workspace.statCards.map((card) => (
            <div key={card.label} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-2 rounded-lg ${card.iconWrapperClassName}`}>
                        {card.icon}
                    </div>
                    <span className="text-2xl font-bold text-gray-900">{card.value}</span>
                </div>
                <p className="text-sm font-medium text-gray-900">{card.label}</p>
                <p className="text-xs text-gray-500">{card.hint}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/50 px-4 py-4 sm:px-6">
                <div>
                  <h3 className="font-semibold text-gray-900">{workspace.sectionTitle}</h3>
                  <p className="mt-1 text-xs text-gray-500">{workspace.sectionDescription}</p>
                </div>
                
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
                {rentals.length === 0 ? (
                  <div className="px-6 py-14 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
                      {activeTab === 'renting' ? <MessageSquare className="h-5 w-5 text-gray-400" /> : <Boxes className="h-5 w-5 text-gray-400" />}
                    </div>
                    <h4 className="mt-4 text-base font-semibold text-gray-900">{workspace.emptyTitle}</h4>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">{workspace.emptyDescription}</p>
                    {activeTab === 'lending' && (
                      <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-verent-yellow px-4 py-2.5 text-sm font-semibold text-verent-black transition-colors hover:bg-verent-yellow-dark"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create your first listing</span>
                      </button>
                    )}
                  </div>
                ) : rentals.map((rental) => (
                    <div key={rental.id} className="flex flex-col gap-4 p-4 transition-colors hover:bg-gray-50 sm:p-6 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 items-start space-x-4">
                            <img src={rental.thumbnail} alt="" className="w-16 h-16 rounded-lg object-cover bg-gray-200" />
                            <div className="min-w-0 flex-1">
                                <h4 className="truncate font-bold text-gray-900">{rental.itemTitle}</h4>
                                <p className="mt-1 text-xs text-gray-500">
                                  {activeTab === 'renting' ? 'Your renter workflow for this asset' : 'Your lister workflow for this asset'}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                                    <span>{rental.startDate}</span>
                                    <ArrowRight className="w-3 h-3" />
                                    <span>{rental.endDate}</span>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                                        rental.status === 'active' ? 'bg-verent-yellow/25 text-verent-yellow-dark' :
                                        rental.status === 'pending_pickup' ? 'bg-orange-100 text-orange-700' :
                                        rental.status === 'pending_approval' ? 'bg-blue-100 text-blue-700' :
                                        rental.status === 'completed' ? 'bg-verent-peach text-verent-yellow-dark' :
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
                        <div className="flex flex-wrap items-center gap-3 md:flex-shrink-0 md:justify-end">
                            {activeTab === 'renting' && (
                                <button
                                    onClick={() => void onMessageOwner(rental.itemId)}
                                    className="flex w-full items-center justify-center space-x-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 sm:w-auto"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    <span>Open Chat</span>
                                </button>
                            )}
                            {activeTab === 'renting' && rental.status === 'pending_pickup' && (
                                <button 
                                    onClick={() => setModalState({ type: 'pickup_qr', rental })}
                                    className="flex w-full items-center justify-center space-x-2 rounded-lg bg-verent-yellow px-4 py-2 text-sm font-semibold text-verent-black transition-colors hover:bg-verent-yellow-dark sm:w-auto"
                                >
                                    <QrCode className="w-4 h-4" />
                                    <span>Display Pickup QR</span>
                                </button>
                            )}
                            {activeTab === 'renting' && rental.status === 'active' && (
                                <button 
                                    onClick={() => setModalState({ type: 'return_qr', rental })}
                                    className="flex w-full items-center justify-center space-x-2 rounded-lg bg-verent-yellow px-4 py-2 text-sm font-semibold text-verent-black transition-colors hover:bg-verent-yellow-dark sm:w-auto"
                                >
                                    <QrCode className="w-4 h-4" />
                                    <span>Display Return QR</span>
                                </button>
                            )}
                            {activeTab === 'lending' && rental.status === 'pending_approval' && (
                                <button
                                    onClick={async () => {
                                      const nextRental = await onAcceptRental(rental.id);
                                      await onRefresh();
                                      showSuccessState(
                                        'Escrow Approved On-Chain',
                                        'This booking request is now approved on Solana and the renter can move into pickup verification.',
                                        nextRental
                                      );
                                    }}
                                    className="flex w-full items-center justify-center space-x-2 rounded-lg bg-verent-yellow px-4 py-2 text-sm font-semibold text-verent-black transition-colors hover:bg-verent-yellow-dark sm:w-auto"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Approve Request</span>
                                </button>
                            )}
                            {activeTab === 'lending' && rental.status === 'pending_pickup' && (
                                <button
                                  onClick={() => setModalState({ type: 'confirm_pickup', rental })}
                                  className="flex w-full items-center justify-center space-x-2 rounded-lg bg-verent-yellow px-4 py-2 text-sm font-semibold text-verent-black transition-colors hover:bg-verent-yellow-dark sm:w-auto"
                                >
                                    <Scan className="w-4 h-4" />
                                    <span>Confirm Pickup</span>
                                </button>
                            )}
                            {activeTab === 'lending' && rental.status === 'active' && (
                                <button
                                  onClick={() => setModalState({ type: 'confirm_return', rental })}
                                  className="flex w-full items-center justify-center space-x-2 rounded-lg bg-verent-yellow px-4 py-2 text-sm font-semibold text-verent-black transition-colors hover:bg-verent-yellow-dark sm:w-auto"
                                >
                                    <Scan className="w-4 h-4" />
                                    <span>Confirm Return</span>
                                </button>
                            )}
                             {rental.status === 'active' && (
                                <div className="text-sm text-gray-500 flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-verent-yellow-dark rounded-full animate-pulse" />
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
                <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center sm:p-8" onClick={e => e.stopPropagation()}>
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
                        <div className="mb-4 inline-block rounded-xl border-2 border-dashed border-gray-200 bg-white p-3 sm:p-4">
                          {qrDataUrl ? (
                            <img src={qrDataUrl} alt="Rental verification QR" className="h-40 w-40 sm:h-48 sm:w-48" />
                          ) : (
                            <QrCode className="h-40 w-40 text-gray-900 sm:h-48 sm:w-48" />
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
                            className="w-full py-3 bg-verent-yellow text-verent-black font-semibold rounded-xl hover:bg-verent-yellow-dark transition-colors disabled:opacity-60"
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
          onClose={() => {
            setSuccessState(null);
            void onRefresh();
          }}
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
