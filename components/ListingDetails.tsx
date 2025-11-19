
import React, { useState } from 'react';
import { Listing, WalletState } from '../types';
import { MOCK_USER } from '../constants';
import { ArrowLeft, ShieldCheck, Info, MapPin, Star, Box, Check, Award, Clock, Zap, Lock, Edit3, Power, BarChart3, AlertTriangle, Wallet, ArrowUpRight } from 'lucide-react';
import BookingModal from './BookingModal';

interface ListingDetailsProps {
  listing: Listing;
  wallet: WalletState;
  onBack: () => void;
  onRent: (amount: number) => Promise<void>;
  onContactOwner: () => void;
}

const ListingDetails: React.FC<ListingDetailsProps> = ({ listing, wallet, onBack, onRent, onContactOwner }) => {
  const [days, setDays] = useState(3);
  const [showBookingModal, setShowBookingModal] = useState(false);
  
  // Check if the current user is the owner of this listing
  const isOwner = listing.ownerId === MOCK_USER.id;
  
  const serviceFee = 0.05; // 5%
  const rentalSubtotal = listing.dailyRateUsdc * days;
  const feeAmount = rentalSubtotal * serviceFee;
  const rentalTotal = rentalSubtotal + feeAmount;

  // "Stake-to-Rent" Logic: Calculate Collateral based on User Tier
  const getCollateralRequirement = (tier: number) => {
    switch(tier) {
      case 3: return 0.10; // Pro: 10%
      case 2: return 0.50; // Verified: 50%
      default: return 1.0; // New: 100%
    }
  };

  const collateralPercent = getCollateralRequirement(MOCK_USER.tier);
  const requiredCollateral = listing.collateralValueUsdc * collateralPercent;
  const totalUpfrontCost = rentalTotal + requiredCollateral;
  
  const canAfford = wallet.usdcBalance >= totalUpfrontCost;

  const handleBookingComplete = async () => {
    await onRent(totalUpfrontCost);
    setShowBookingModal(false);
  };

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* Sticky Header for Navigation */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center justify-between">
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
             <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                <Box className="w-4 h-4" />
             </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Immersive Hero Image */}
        <div className="relative w-full h-[400px] lg:h-[500px] rounded-3xl overflow-hidden mb-8 group">
            <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            <div className="absolute bottom-8 left-8 text-white">
                 <div className="flex items-center space-x-3 mb-3">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs uppercase font-bold tracking-wider rounded-full">
                        {listing.category}
                    </span>
                    <span className="flex items-center space-x-1 text-verent-green text-xs font-bold bg-black/40 px-3 py-1 rounded-full backdrop-blur-md border border-verent-green/30">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verified Asset</span>
                    </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">{listing.title}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-200">
                    <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {listing.location}
                    </span>
                    <span className="flex items-center">
                        <Star className="w-4 h-4 mr-1 text-orange-400 fill-orange-400" />
                        4.9 (24 Reviews)
                    </span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
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
                         <div className="space-y-1">
                                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Condition</p>
                                <p className="text-sm font-medium text-gray-900 font-mono border-l-2 border-green-500 pl-3">Excellent</p>
                        </div>
                    </div>
                </div>

                {/* Description */}
                 <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">About this asset</h3>
                    <p className="text-gray-600 leading-relaxed text-lg">
                        {listing.description} This unit is maintained by professional technicians and includes a Pelican hard case for transport. Firmware is up to date as of October 2023. Ideal for high-end commercial production or research applications requiring maximum reliability.
                    </p>
                </div>

                {/* Owner Info */}
                <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-200">
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <img src={listing.ownerAvatar} alt={listing.ownerName} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm" />
                            <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full border-2 border-white">
                                <Check className="w-3 h-3" />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">{isOwner ? 'You (Owner)' : listing.ownerName}</h3>
                            <p className="text-sm text-gray-500">Joined Sep 2023 • <span className="text-gray-900 font-medium">98% Response Rate</span></p>
                        </div>
                    </div>
                    {!isOwner && (
                        <button 
                          onClick={onContactOwner}
                          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            Contact Owner
                        </button>
                    )}
                </div>

                {/* Trust & Safety Banner */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="p-6 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start space-x-4">
                        <Award className="w-6 h-6 text-blue-600 flex-shrink-0" />
                        <div>
                            <h4 className="font-bold text-blue-900 text-sm">Insurance Included</h4>
                            <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                                Every rental on Verent is covered up to $50,000 against accidental damage and theft.
                            </p>
                        </div>
                     </div>
                     <div className="p-6 rounded-2xl bg-verent-green/5 border border-verent-green/20 flex items-start space-x-4">
                        <Lock className="w-6 h-6 text-verent-green flex-shrink-0" />
                        <div>
                            <h4 className="font-bold text-gray-900 text-sm">Escrow Protected</h4>
                            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                Funds are held in a smart contract and only released when you confirm pickup via QR code.
                            </p>
                        </div>
                     </div>
                </div>
            </div>

            {/* RIGHT COLUMN - Sticky Booking Card OR Management Card */}
            <div className="lg:col-span-4">
                <div className="sticky top-24 space-y-6">
                    
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
                                    <span>Active</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Earnings</p>
                                    <p className="text-lg font-bold text-gray-900 font-mono mt-1">$1,450</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Views</p>
                                    <p className="text-lg font-bold text-gray-900 font-mono mt-1">342</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors group">
                                    <div className="flex items-center space-x-3">
                                        <Edit3 className="w-4 h-4 text-gray-400 group-hover:text-gray-900" />
                                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Edit Details & Price</span>
                                    </div>
                                    <ArrowLeft className="w-4 h-4 text-gray-300 rotate-180 group-hover:text-gray-900" />
                                </button>

                                <button className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors group">
                                    <div className="flex items-center space-x-3">
                                        <BarChart3 className="w-4 h-4 text-gray-400 group-hover:text-gray-900" />
                                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">View Analytics</span>
                                    </div>
                                    <ArrowLeft className="w-4 h-4 text-gray-300 rotate-180 group-hover:text-gray-900" />
                                </button>

                                <button className="w-full flex items-center justify-between p-4 bg-white border border-red-100 rounded-xl hover:bg-red-50 transition-colors group">
                                    <div className="flex items-center space-x-3">
                                        <Power className="w-4 h-4 text-red-400 group-hover:text-red-600" />
                                        <span className="text-sm font-medium text-red-600">Pause Listing</span>
                                    </div>
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
                                    <span className="text-xs font-bold text-verent-green bg-green-50 px-2 py-1 rounded-md">Available Today</span>
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
                                        <span className="font-semibold">You save ${(listing.collateralValueUsdc - requiredCollateral).toLocaleString()}</span> thanks to your Tier {MOCK_USER.tier} status.
                                        {MOCK_USER.tier < 3 && (
                                            <button className="flex items-center space-x-1 mt-1 text-blue-800 font-bold hover:underline">
                                                <span>Upgrade Tier</span>
                                                <ArrowUpRight className="w-2.5 h-2.5" />
                                            </button>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                                      <span>Total Upfront Required</span>
                                      <span className="font-bold text-gray-900 font-mono">${totalUpfrontCost.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {canAfford ? (
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
                            
                            <button className="w-full mt-2 flex items-center justify-center space-x-1 text-xs text-gray-400 hover:text-gray-600">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Report this listing</span>
                            </button>
                        </div>
                    )}
                    
                    {/* Help Box */}
                     <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-start space-x-3">
                        <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-500 leading-relaxed">
                            <strong>Pro Tip:</strong> Renting for 7+ days automatically applies a 10% volume discount on the daily rate.
                        </p>
                     </div>
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
          />
      )}
    </div>
  );
};

export default ListingDetails;
