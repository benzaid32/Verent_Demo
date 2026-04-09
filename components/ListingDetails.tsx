
import React, { useEffect, useMemo, useState } from 'react';
import { Listing, QuoteResponse, Rental, User, WalletState } from '../types';
import { ArrowLeft, ShieldCheck, MapPin, CheckCircle2, Clock, Zap, Lock, Edit3, Wallet, Sparkles, Boxes, ArrowRight, BadgeCheck } from 'lucide-react';
import BookingModal from './BookingModal';
import OnChainProofCard from './OnChainProofCard';
import EditListingModal from './EditListingModal';
import type { UpdateListingRequest } from '../shared/contracts';

interface ListingDetailsProps {
  listing: Listing;
  profile: User;
  wallet: WalletState;
  onBack: () => void;
  onRent: (days: number) => Promise<Rental>;
  onBookingFinished: () => void;
  onContactOwner: () => Promise<void> | void;
  onUpdateListing: (listingId: string, payload: UpdateListingRequest) => Promise<Listing>;
  requestQuote: (listingId: string, days: number) => Promise<QuoteResponse>;
}

const ListingDetails: React.FC<ListingDetailsProps> = ({ listing, profile, wallet, onBack, onRent, onBookingFinished, onContactOwner, onUpdateListing, requestQuote }) => {
  const [days, setDays] = useState(3);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  
  // Check if the current user is the owner of this listing
  const isOwner = listing.ownerId === profile.id;
  
  useEffect(() => {
    let active = true;
    setQuoteLoading(true);
    void requestQuote(listing.id, days).then((nextQuote) => {
      if (active) {
        setQuote(nextQuote);
      }
    }).finally(() => {
      if (active) {
        setQuoteLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [days, listing.id, requestQuote]);

  const rentalSubtotal = quote?.rentalSubtotal ?? listing.dailyRateUsdc * days;
  const feeAmount = quote?.feeAmount ?? 0;
  const rentalTotal = quote?.rentalTotal ?? rentalSubtotal;
  const requiredCollateral = quote?.requiredCollateral ?? 0;
  const totalUpfrontCost = quote?.totalUpfrontCost ?? rentalTotal + requiredCollateral;
  
  const canAfford = wallet.usdcBalance >= totalUpfrontCost;
  const ownerWalletLabel = listing.ownerWalletAddress
    ? `${listing.ownerWalletAddress.slice(0, 6)}...${listing.ownerWalletAddress.slice(-6)}`
    : null;
  const availabilityLabel = listing.availability.replace(/_/g, ' ');
  const collateralSavings = Math.max(0, listing.collateralValueUsdc - requiredCollateral);

  const overviewStats = useMemo(() => ([
    {
      label: 'Category',
      value: listing.category,
      icon: <Boxes className="h-4 w-4 text-gray-400" />
    },
    {
      label: 'Location',
      value: listing.location,
      icon: <MapPin className="h-4 w-4 text-gray-400" />
    },
    {
      label: 'Availability',
      value: availabilityLabel,
      icon: <BadgeCheck className="h-4 w-4 text-gray-400" />
    },
    {
      label: 'Daily Rate',
      value: `$${listing.dailyRateUsdc.toFixed(2)}`,
      icon: <Wallet className="h-4 w-4 text-gray-400" />
    }
  ]), [availabilityLabel, listing.category, listing.dailyRateUsdc, listing.location]);

  const handleBookingComplete = async () => {
    return onRent(days);
  };

  return (
    <div className="mx-auto max-w-[1400px] animate-in fade-in duration-500">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 bg-white/80 px-4 py-4 backdrop-blur-md sm:px-6">
         <button 
            onClick={onBack}
            className="flex items-center space-x-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-black"
        >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
        </button>
        <div className="text-sm font-bold text-gray-900 hidden sm:block">{listing.title}</div>
        <div className="flex items-center space-x-2">
             {isOwner && (
                 <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200 mr-2">Owner View</span>
             )}
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="group relative mb-6 h-[320px] w-full overflow-hidden rounded-[2rem] border border-gray-200 bg-gray-950 sm:mb-8 sm:h-[420px] lg:h-[520px]">
            <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"></div>
            <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2 sm:left-6 sm:top-6">
              <span className="rounded-full border border-white/25 bg-black/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                {listing.category}
              </span>
              {listing.productType && (
                <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                  {listing.productType}
                </span>
              )}
            </div>
            <div className="absolute bottom-4 right-4 rounded-full border border-white/15 bg-black/45 px-4 py-2 text-right text-white backdrop-blur-md sm:bottom-6 sm:right-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-300">Starting at</p>
              <p className="text-lg font-bold tracking-tight sm:text-xl">${listing.dailyRateUsdc.toFixed(0)}<span className="ml-1 text-xs font-medium text-gray-300 sm:text-sm">/day</span></p>
            </div>
        </div>

        <div className="mb-8 rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center space-x-1 rounded-full border border-verent-green/20 bg-verent-green/[0.06] px-3 py-1 text-xs font-semibold text-verent-green">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>On-Chain Listed</span>
                </span>
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                  {availabilityLabel}
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">{listing.title}</h1>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500 sm:gap-4">
                <span className="flex items-center">
                  <MapPin className="mr-1 w-4 h-4" />
                  {listing.location}
                </span>
                <span>{listing.category}{listing.productType ? ` • ${listing.productType}` : ''}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 lg:min-w-[220px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Daily rate</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">${listing.dailyRateUsdc.toFixed(0)}</p>
              <p className="mt-1 text-sm text-gray-500">per day</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="space-y-8 lg:col-span-8">
                <section className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Overview</p>
                      <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">Professional asset profile</h2>
                    </div>
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600">
                      <Sparkles className="h-3.5 w-3.5 text-verent-green" />
                      <span>Minimal, investor-ready presentation</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {overviewStats.map((stat) => (
                      <div key={stat.label} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{stat.label}</span>
                          {stat.icon}
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-2xl border border-verent-green/15 bg-verent-green/[0.04] p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <Lock className="mt-0.5 h-5 w-5 flex-shrink-0 text-verent-green" />
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">Escrow-native rental flow</h3>
                        <p className="mt-1 text-sm leading-relaxed text-gray-600">
                          Booking funds and refundable collateral are enforced through the Verent rental program, with every important state transition backed by on-chain proof.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                    <h3 className="mb-6 flex items-center space-x-2 text-lg font-bold text-gray-900">
                        <Zap className="w-5 h-5 text-gray-400" />
                        <span>Technical Specifications</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {listing.specs.map((spec, idx) => (
                            <div key={idx} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Feature {idx + 1}</p>
                                <p className="mt-2 text-sm font-medium text-gray-900">{spec}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="mb-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">About</p>
                    <h3 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">Why this listing stands out</h3>
                  </div>
                  <p className="max-w-3xl text-base leading-8 text-gray-600">
                    {listing.description}
                  </p>
                </section>

                <section className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Owner</p>
                      <h3 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">Trusted operator</h3>
                    </div>
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-green-100 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Verified profile</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <img src={listing.ownerAvatar} alt={listing.ownerName} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm" />
                            <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-full border-2 border-white">
                                <CheckCircle2 className="w-3 h-3" />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">{isOwner ? 'You (Owner)' : listing.ownerName}</h3>
                            <p className="text-sm text-gray-500">
                              {ownerWalletLabel ? `Wallet ${ownerWalletLabel}` : 'Embedded wallet connected'}
                            </p>
                        </div>
                    </div>
                    {!isOwner && (
                        <button 
                          onClick={() => { void onContactOwner(); }}
                          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 sm:w-auto"
                        >
                            Contact Owner
                        </button>
                    )}
                  </div>
                </section>

                <OnChainProofCard
                  signature={listing.confirmedSignature}
                  programId={listing.programId}
                  accountLabel="Listing PDA"
                  accountValue={listing.listingPda}
                  confirmedSlot={listing.confirmedSlot}
                  cluster={listing.chainCluster}
                  protocolVersion={listing.protocolVersion}
                />
            </div>

            <div className="lg:col-span-4">
                <div className="space-y-5 lg:sticky lg:top-24">
                    {isOwner ? (
                        <div className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-xl shadow-gray-200/40">
                            <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
                                <div className="flex items-center space-x-2">
                                    <div className="p-2 bg-gray-100 rounded-lg">
                                        <Edit3 className="w-4 h-4 text-gray-900" />
                                    </div>
                                    <span className="font-bold text-gray-900">Owner Controls</span>
                                </div>
                                <div className="flex items-center space-x-1 rounded bg-green-50 px-2 py-1 text-xs font-bold text-green-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    <span>{availabilityLabel}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Listing performance</p>
                                  <p className="mt-2 text-sm leading-6 text-gray-600">
                                    Keep pricing, metadata, and presentation sharp to improve trust and conversion.
                                  </p>
                                </div>
                                <button onClick={() => setShowEditModal(true)} className="group flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50">
                                    <div className="flex items-center space-x-3">
                                        <Edit3 className="w-4 h-4 text-gray-400 group-hover:text-gray-900" />
                                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Edit Details & Price</span>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-900" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-xl shadow-gray-200/40">
                            <div className="border-b border-gray-100 bg-gray-50/70 p-6">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex flex-col">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">Reserve this asset</p>
                                      <span className="mt-2 text-4xl font-bold tracking-tight text-gray-900 font-mono">${listing.dailyRateUsdc.toFixed(0)}</span>
                                      <span className="text-sm font-medium text-gray-400">per day</span>
                                  </div>
                                  <div className="flex flex-col items-end">
                                      <span className="rounded-md bg-green-50 px-2.5 py-1 text-xs font-bold uppercase text-verent-green">{availabilityLabel}</span>
                                      <span className="mt-3 text-xs text-gray-400">Wallet balance: ${wallet.usdcBalance.toFixed(2)}</span>
                                  </div>
                                </div>
                            </div>

                            <div className="space-y-5 p-6">
                                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Duration</label>
                                    <div className="flex items-center justify-between">
                                        <button onClick={() => setDays(Math.max(1, days - 1))} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">-</button>
                                        <span className="font-medium text-gray-900">{days} {days === 1 ? 'Day' : 'Days'}</span>
                                        <button onClick={() => setDays(days + 1)} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">+</button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Quote Summary</p>
                                      <div className="mt-4 space-y-3">
                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>${listing.dailyRateUsdc} x {days} days</span>
                                        <span>${rentalSubtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>Protocol Fee (5%)</span>
                                        <span>${feeAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="border-t border-gray-100 pt-3 pb-1 flex justify-between items-center">
                                        <span className="font-bold text-gray-900">Rental Total</span>
                                        <span className="font-bold text-gray-900 font-mono">${rentalTotal.toFixed(2)}</span>
                                    </div>
                                      </div>
                                    </div>

                                    <div className="space-y-2 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                      <div className="flex justify-between items-center">
                                        <div className="flex items-center space-x-1">
                                          <Lock className="w-3 h-3 text-blue-600" />
                                          <span className="text-xs font-bold text-blue-800">Collateral Deposit</span>
                                        </div>
                                        <span className="text-xs font-bold text-blue-800 font-mono">${requiredCollateral.toFixed(2)}</span>
                                      </div>
                                      <div className="text-[10px] text-blue-600 leading-snug">
                                        Fully refundable upon return. 
                                        <br />
                                        <span className="font-semibold">You save ${collateralSavings.toLocaleString()}</span> thanks to your Tier {profile.tier} status.
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 text-xs text-gray-500">
                                      <span>Total Upfront Required</span>
                                      <span className="font-bold text-gray-900 font-mono text-sm">${totalUpfrontCost.toFixed(2)}</span>
                                    </div>
                                </div>

                            {quoteLoading ? (
                                <button disabled className="w-full cursor-wait rounded-xl bg-gray-100 py-4 font-bold text-gray-400">
                                    Calculating Escrow Quote...
                                </button>
                            ) : canAfford ? (
                                <button 
                                    onClick={() => setShowBookingModal(true)}
                                    className="flex w-full items-center justify-center space-x-2 rounded-xl bg-black py-4 font-bold text-white shadow-lg shadow-gray-300 transition-all hover:-translate-y-0.5 hover:bg-gray-800 hover:shadow-gray-400"
                                >
                                    <span>Request to Book</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <button disabled className="w-full cursor-not-allowed rounded-xl bg-gray-100 py-4 font-bold text-gray-400">
                                        Insufficient Balance
                                    </button>
                                    <p className="text-xs text-center text-red-500 font-medium">
                                        You need ${ (totalUpfrontCost - wallet.usdcBalance).toFixed(2) } more USDC
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center justify-center space-x-1.5 text-xs text-gray-400">
                                <Clock className="w-3 h-3" />
                                <span>Avg. confirmation time: ~2 mins</span>
                            </div>
                        </div>
                    </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      {showBookingModal && (
          <BookingModal 
            listing={listing} 
            days={days} 
            rentalTotal={rentalTotal}
            collateralAmount={requiredCollateral}
            onClose={() => setShowBookingModal(false)} 
            onConfirm={handleBookingComplete}
            onDone={() => {
              setShowBookingModal(false);
              onBookingFinished();
            }}
          />
      )}
      {showEditModal && (
        <EditListingModal
          listing={listing}
          onClose={() => setShowEditModal(false)}
          onSave={(payload) => onUpdateListing(listing.id, payload)}
        />
      )}
    </div>
  );
};

export default ListingDetails;
