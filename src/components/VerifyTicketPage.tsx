import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ArrowLeft,
  User,
  Calendar,
  Clock,
  MapPin,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type TicketStatus = 'loading' | 'valid' | 'verified' | 'error';
type TicketInfo = {
  name: string;
  email: string;
  phone_number?: string;
  date: string;
  time: string;
  pickup: string;
  dropoff: string;
};

type VerificationDetails = {
  verifiedAt: string;
  verifiedBy: string;
};

export const VerifyTicketPage = () => {
  const { ticketId, ticketNumber } = useParams<{ ticketId: string; ticketNumber: string }>();
  const [status, setStatus] = useState<TicketStatus>('loading');
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [verificationDetails, setVerificationDetails] = useState<VerificationDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showVerifyConfirm, setShowVerifyConfirm] = useState(false);
  const [freshlyRedeemed, setFreshlyRedeemed] = useState(false);

  // Load ticket information on component mount
  useEffect(() => {
    fetchTicketInfo();
  }, [ticketId, ticketNumber]);

  // Fetch ticket information and verification status
  const fetchTicketInfo = async () => {
    if (!ticketId || !ticketNumber) {
      setErrorMessage('Invalid ticket information');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage(null);

    try {
      console.log('Fetching ticket info for:', { ticketId, ticketNumber });
      
      // First, check if the ticket exists and get its information
      const { data, error } = await supabase.rpc('verify_ticket', {
        p_ticket_id: ticketId,
        p_ticket_number: parseInt(ticketNumber),
        p_verifier_id: null
      });

      if (error) throw error;

      console.log('Ticket verification response:', data);
      
      // Handle ticket data
      if (data.ticket) {
        setTicketInfo(data.ticket);
      } else {
        throw new Error('No ticket information returned');
      }

      // Now, directly check the verification table to see if this ticket has been verified
      const { data: verificationData, error: verificationError } = await supabase
        .from('ticket_verifications')
        .select('verified_at, verified_by')
        .eq('ticket_id', ticketId);

      if (verificationError) {
        throw verificationError;
      }

      console.log('Verification table check:', verificationData);

      // If we found a verification record, the ticket is verified
      if (verificationData && verificationData.length > 0) {
        console.log('Found verification record, setting status to VERIFIED');
        setStatus('verified');
        setVerificationDetails({
          verifiedAt: verificationData[0].verified_at,
          verifiedBy: verificationData[0].verified_by || 'Unknown'
        });
      } else if (data.success) {
        console.log('No verification record found, setting status to VALID');
        setStatus('valid');
      } else {
        console.log('Setting status to ERROR');
        setErrorMessage(data.error || 'Unknown error occurred');
        setStatus('error');
      }
    } catch (err: any) {
      console.error('Error fetching ticket:', err);
      setErrorMessage(err.message);
      setStatus('error');
    }
  };

  // Add a useEffect to log state changes
  useEffect(() => {
    console.log('Current status:', status);
    console.log('Verification details:', verificationDetails);
  }, [status, verificationDetails]);

  // Handle ticket verification
  const verifyTicket = async () => {
    if (!ticketId || !ticketNumber) return;

    setStatus('loading');
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.rpc('verify_ticket', {
        p_ticket_id: ticketId,
        p_ticket_number: parseInt(ticketNumber),
        p_verifier_id: null,
        p_confirm: true
      });

      if (error) throw error;

      console.log('Ticket redemption response:', data);

      if (data.success) {
        setStatus('verified');
        setVerificationDetails({
          verifiedAt: data.verifiedAt,
          verifiedBy: data.verifiedBy
        });
        setShowVerifyConfirm(false);
        setFreshlyRedeemed(true);
      } else {
        if (data.isVerified) {
          // Ticket was already verified
          setStatus('verified');
          setVerificationDetails({
            verifiedAt: data.verifiedAt,
            verifiedBy: data.verifiedBy
          });
          setFreshlyRedeemed(false);
        } else {
          setErrorMessage(data.error || 'Failed to redeem ticket');
          setStatus('error');
        }
      }
    } catch (err: any) {
      console.error('Error redeeming ticket:', err);
      setErrorMessage(err.message);
      setStatus('error');
    }
  };

  // Format date string
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format time string
  const formatTime = (timeString: string) => {
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Format datetime string
  const formatDateTime = (dateTimeString: string) => {
    return new Date(dateTimeString).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="container mx-auto max-w-lg">
        <Link 
          to="/"
          className="inline-flex items-center text-gold hover:text-gold/80 mb-8"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Home
        </Link>

        <div className="bg-gray-900 rounded-xl border border-gold/30 overflow-hidden">
          {/* Header - Add color based on status */}
          <div className={`p-6 border-b ${
            status === 'verified' 
              ? freshlyRedeemed 
                ? 'border-green-500 bg-green-900/20' 
                : 'border-red-500 bg-red-900/20' 
              : 'border-gray-800'
          }`}>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Ticket Redemption</h1>
              <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                status === 'verified'
                  ? freshlyRedeemed
                    ? 'bg-green-900/60 text-green-400'
                    : 'bg-red-900/60 text-red-400'
                  : status === 'error'
                    ? 'bg-red-900/60 text-red-400'
                    : 'bg-yellow-900/60 text-yellow-400'
              }`}>
                {status === 'verified' && freshlyRedeemed && <CheckCircle size={16} className="mr-2" />}
                {status === 'verified' && !freshlyRedeemed && <XCircle size={16} className="mr-2" />}
                {status === 'error' && <XCircle size={16} className="mr-2" />}
                {status === 'valid' && <AlertTriangle size={16} className="mr-2" />}
                {status === 'verified' 
                  ? freshlyRedeemed 
                    ? 'Successfully Redeemed' 
                    : 'Already Redeemed' 
                  : status === 'error' 
                    ? 'Error' 
                    : 'Pending'}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Verification Message - Success or Warning */}
            {status === 'verified' && verificationDetails && (
              <div className={`${
                freshlyRedeemed 
                  ? 'bg-green-900/30 border-2 border-green-500 animate-pulse' 
                  : 'bg-red-900/30 border-2 border-red-500 animate-pulse'
              } rounded-lg p-4 mb-6`}>
                <div className="flex items-start">
                  {freshlyRedeemed ? (
                    <CheckCircle className="w-6 h-6 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className={`${
                      freshlyRedeemed ? 'text-green-200' : 'text-red-200'
                    } font-bold text-lg`}>
                      {freshlyRedeemed 
                        ? 'Ticket successfully redeemed!' 
                        : 'This ticket has already been redeemed!'}
                    </p>
                    <p className={`${
                      freshlyRedeemed ? 'text-green-300' : 'text-red-300'
                    } mt-2`}>
                      Redeemed at: {formatDateTime(verificationDetails.verifiedAt)}
                    </p>
                    <p className={freshlyRedeemed ? 'text-green-300' : 'text-red-300'}>
                      Redeemed by: {verificationDetails.verifiedBy}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-red-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-red-200">{errorMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Ticket Information */}
            {ticketInfo ? (
              <div className="space-y-6">
                {/* Passenger Info */}
                <div>
                  <h3 className="text-sm uppercase text-gray-500 mb-3">Passenger Information</h3>
                  <div className={`rounded-lg p-4 ${
                    status === 'verified' 
                      ? freshlyRedeemed 
                        ? 'bg-green-900/20 border border-green-500/30' 
                        : 'bg-red-900/20 border border-red-500/30' 
                      : 'bg-gray-800/50'
                  }`}>
                    <div className="flex items-center mb-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                        status === 'verified' 
                          ? freshlyRedeemed 
                            ? 'bg-green-500/20' 
                            : 'bg-red-500/20' 
                          : 'bg-gold/20'
                      }`}>
                        <User className={`w-5 h-5 ${
                          status === 'verified' 
                            ? freshlyRedeemed 
                              ? 'text-green-400' 
                              : 'text-red-400' 
                            : 'text-gold'
                        }`} />
                      </div>
                      <div>
                        <div className="font-medium text-white">{ticketInfo.name}</div>
                        <div className="text-sm text-gray-400">{ticketInfo.email}</div>
                      </div>
                    </div>
                    {ticketInfo.phone_number && (
                      <div className="text-sm text-gray-400">
                        Phone: {ticketInfo.phone_number}
                      </div>
                    )}
                  </div>
                </div>

                {/* Route Info */}
                <div>
                  <h3 className="text-sm uppercase text-gray-500 mb-3">Route Details</h3>
                  <div className={`rounded-lg p-4 space-y-3 ${
                    status === 'verified' 
                      ? freshlyRedeemed 
                        ? 'bg-green-900/20 border border-green-500/30' 
                        : 'bg-red-900/20 border border-red-500/30' 
                      : 'bg-gray-800/50'
                  }`}>
                    <div className="flex items-center">
                      <Calendar className={`w-4 h-4 mr-2 ${
                        status === 'verified' 
                          ? freshlyRedeemed 
                            ? 'text-green-400' 
                            : 'text-red-400' 
                          : 'text-gold'
                      }`} />
                      <span className="text-gray-300">{formatDate(ticketInfo.date)}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className={`w-4 h-4 mr-2 ${
                        status === 'verified' 
                          ? freshlyRedeemed 
                            ? 'text-green-400' 
                            : 'text-red-400' 
                          : 'text-gold'
                      }`} />
                      <span className="text-gray-300">{formatTime(ticketInfo.time)}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className={`w-4 h-4 mr-2 ${
                        status === 'verified' 
                          ? freshlyRedeemed 
                            ? 'text-green-400' 
                            : 'text-red-400' 
                          : 'text-gold'
                      }`} />
                      <span className="text-gray-300">
                        {ticketInfo.pickup} to {ticketInfo.dropoff}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Verification Confirmation */}
                {showVerifyConfirm && status === 'valid' && (
                  <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4">
                    <p className="text-yellow-200 mb-4">
                      Are you sure you want to redeem this ticket?
                    </p>
                    <div className="flex space-x-3">
                      <button
                        onClick={verifyTicket}
                        disabled={status === 'loading'}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded transition-colors flex items-center justify-center"
                      >
                        {status === 'loading' ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          'Confirm Redemption'
                        )}
                      </button>
                      <button
                        onClick={() => setShowVerifyConfirm(false)}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-300">No ticket information available</p>
              </div>
            )}

            {/* Redeem Button - Only show for valid tickets that haven't been redeemed */}
            {status === 'valid' && !showVerifyConfirm && (
              <button
                onClick={() => setShowVerifyConfirm(true)}
                className="w-full mt-6 bg-gold hover:bg-yellow-400 text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center"
              >
                Redeem This Ticket
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};