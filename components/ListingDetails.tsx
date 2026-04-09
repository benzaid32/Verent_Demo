
import React, { useEffect, useState } from 'react';
import { Listing, QuoteResponse, Rental, User, WalletState } from '../types';
import { ArrowLeft, ShieldCheck, MapPin, CheckCircle2, Clock, Zap, Lock, Edit3, Wallet } from 'lucide-react';
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

  const handleBookingComplete = async () => {
    return onRent(days);
  };

  return (
    <div className="mx-auto max-w-[1400px] animate-in fade-in duration-500">
      {/* Sticky Header for Navigation */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 bg-white/80 px-4 py-4 backdrop-blur-md sm:px-6">
         <button 
            onClick={onBack}
            className="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-black transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300"
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
        {/* Immersive Hero Image */}
        <div className="group relative mb-6 h-[280px] w-full overflow-hidden rounded-3xl sm:mb-8 sm:h-[360px] lg:h-[500px]">
            <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            <div className="absolute bottom-5 left-4 right-4 text-white sm:bottom-8 sm:left-8 sm:right-auto">
                 <div className="mb-3 flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs uppercase font-bold tracking-wider rounded-full">
                        {listing.category}
                    </span>
                    {listing.productType && (
                      <span className="px-3 py-1 bg-black/30 backdrop-blur-md border border-white/10 text-white text-xs uppercase font-bold tracking-wider rounded-full">
                        {listing.productType}
                      </span>
                    )}
                    <span className="flex items-center space-x-1 text-verent-green text-xs font-bold bg-black/40 px-3 py-1 rounded-full backdrop-blur-md border border-verent-green/30">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>On-Chain Listed</span>
                    </span>
                </div>
                <h1 className="mb-2 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">{listing.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-200 sm:gap-4">
                    <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {listing.location}
                    </span>
                    <span className="flex items-center">{listing.availability.replace('_', ' ')}</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
            
            {/* LEFT COLUMN - Content */}
            <div className="lg:col-span-8 space-y-10">
                
                {/* Specs Grid - Technical & B2B Focused */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center space-x-2">
                        <Zap className="w-5 h-5 text-gray-400" />
                        <span>Technical Specifications</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-8">
                        {listing.specs.map((spec, idx) => (
                            <div key={idx} className="space-y-1">
                                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Feature {idx + 1}</p>
                                <p className="text-sm font-medium text-gray-900 font-mono border-l-2 border-gray-200 pl-3">{spec}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Description */}
                 <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">About this asset</h3>
                    <p className="text-gray-600 leading-relaxed text-lg">
                        {listing.description}
                    </p>
                </div>

                {/* Owner Info */}
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

                <OnChainProofCard
                  signature={listing.confirmedSignature}
                  programId={listing.programId}
                  accountLabel="Listing PDA"
                  accountValue={listing.listingPda}
                  confirmedSlot={listing.confirmedSlot}
                  cluster={listing.chainCluster}
                  protocolVersion={listing.protocolVersion}
                />

                <div className="p-6 rounded-2xl bg-verent-green/5 border border-verent-green/20 flex items-start space-x-4">
                    <Lock className="w-6 h-6 text-verent-green flex-shrink-0" />
                    <div>
                        <h4 className="font-bold text-gray-900 text-sm">Escrow Protected</h4>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                            Booking funds and collateral are locked through the Verent rental program and every successful state change surfaces fresh chain proof.
                        </p>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN - Sticky Booking Card OR Management Card */}
            <div className="lg:col-span-4">
                <div className="space-y-6 lg:sticky lg:top-24">
                    
                    {/* CONDITIONAL RENDER: OWNER vs RENTER */}
                    {isOwner ? (
                        /* OWNER MANAGEMENT CARD */
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/40">
                            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                                <div className="flex items-center space-x-2">
                                    <div className="p-2 bg-gray-100 rounded-lg">
                                        <Edit3 className="w-4 h-4 text-gray-900" />
                                    </div>
                                    <span className="font-bold text-gray-900">Manage Listing</span>
                                </div>
                                <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    <span>{listing.availability}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button onClick={() => setShowEditModal(true)} className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors group">
                                    <div className="flex items-center space-x-3">
                                        <Edit3 className="w-4 h-4 text-gray-400 group-hover:text-gray-900" />
                                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Edit Details & Price</span>
                                    </div>
                                    <ArrowLeft className="w-4 h-4 text-gray-300 rotate-180 group-hover:text-gray-900" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* RENTER BOOKING CARD */
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/40">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex flex-col">
                                    <span className="text-3xl font-bold text-gray-900 font-mono tracking-tight">${listing.dailyRateUsdc}</span>
                                    <span className="text-sm text-gray-400 font-medium">per day</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-xs font-bold text-verent-green bg-green-50 px-2 py-1 rounded-md uppercase">{listing.availability}</span>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Duration</label>
                                    <div className="flex items-center justify-between">
                                        <button onClick={() => setDays(Math.max(1, days - 1))} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">-</button>
                                        <span className="font-medium text-gray-900">{days} Days</span>
                                        <button onClick={() => setDays(days + 1)} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">+</button>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
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
                                    
                                    {/* Collateral Section */}
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 space-y-2">
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
                                        <span className="font-semibold">You save ${Math.max(0, listing.collateralValueUsdc - requiredCollateral).toLocaleString()}</span> thanks to your Tier {profile.tier} status.
                                      </div>
                                    </div>

                                    <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                                      <span>Total Upfront Required</span>
                                      <span className="font-bold text-gray-900 font-mono">${totalUpfrontCost.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {quoteLoading ? (
                                <button disabled className="w-full bg-gray-100 text-gray-400 font-bold py-4 rounded-xl cursor-wait">
                                    Calculating Escrow Quote...
                                </button>
                            ) : canAfford ? (
                                <button 
                                    onClick={() => setShowBookingModal(true)}
                                    className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-300 hover:shadow-gray-400 hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                                >
                                    <span>Request to Book</span>
                                    <ArrowLeft className="w-4 h-4 rotate-180" />
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <button disabled className="w-full bg-gray-100 text-gray-400 font-bold py-4 rounded-xl cursor-not-allowed">
                                        Insufficient Balance
                                    </button>
                                    <p className="text-xs text-center text-red-500 font-medium">
                                        You need ${ (totalUpfrontCost - wallet.usdcBalance).toFixed(2) } more USDC
                                    </p>
                                </div>
                            )}

                            <div className="mt-4 flex items-center justify-center space-x-1.5 text-xs text-gray-400">
                                <Clock className="w-3 h-3" />
                                <span>Avg. confirmation time: ~2 mins</span>
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
