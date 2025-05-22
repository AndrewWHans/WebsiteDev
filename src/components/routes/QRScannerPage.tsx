import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  Camera,
  Loader2,
  AlertTriangle,
  QrCode,
  Ticket
} from 'lucide-react';

export const QRScannerPage = () => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [ticketInfo, setTicketInfo] = useState<{ticketId: string, ticketNumber: string} | null>(null);
  
  useEffect(() => {
    // Cleanup scanner on unmount
    return () => {
      if (scanner) {
        scanner.clear();
      }
    };
  }, [scanner]);

  const startScanning = async () => {
    try {
      setError(null);
      setScanning(true);
      setTicketInfo(null);

      // Check for camera permissions first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Release the stream immediately after permission check
        stream.getTracks().forEach(track => track.stop());
      } catch (permissionErr: any) {
        throw new Error(
          permissionErr.name === 'NotAllowedError' 
            ? 'Camera access denied. Please allow camera access and try again.'
            : 'Camera not available. Please check your device settings.'
        );
      }

      const html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.333333,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultZoomValueIfSupported: 2
        },
        false
      );

      const onScanSuccess = (decodedText: string) => {
        const match = decodedText.match(/\/verify\/([^\/]+)\/(\d+)/);
        if (match) {
          const [, ticketId, ticketNumber] = match;
          html5QrcodeScanner.clear();
          setScanner(null);
          setScanning(false);
          setTicketInfo({ ticketId, ticketNumber });
        } else {
          setError('Invalid QR code format');
        }
      };

      const onScanError = (error: string) => {
        console.error('QR scan error:', error);
        // Don't set error state for every scan error, only for critical failures
      };

      html5QrcodeScanner.render(onScanSuccess, onScanError);
      setScanner(html5QrcodeScanner);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setError(err.message || 'Failed to start camera');
      setScanning(false);
    }
  };

  const stopScanning = () => {
    setScanning(false);
    if (scanner) {
      scanner.clear();
      setScanner(null);
    }
  };

  const resetScanner = () => {
    setTicketInfo(null);
    setError(null);
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Scan Tickets</h1>
        </div>

        {/* Camera Preview */}
        <div className="bg-gray-100 relative rounded-xl overflow-hidden mb-6" style={{minHeight: "300px"}}>
          {!scanning && !ticketInfo ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 p-6">
              <Camera className="h-16 w-16 text-gray-400 mb-4" />
              <button
                onClick={startScanning}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <QrCode className="h-5 w-5 mr-2" />
                Start Scanning
              </button>
            </div>
          ) : scanning ? (
            <div id="qr-reader" className="w-full h-full"></div>
          ) : ticketInfo ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 p-6">
              <Ticket className="h-16 w-16 text-indigo-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Ticket Found</h2>
              <div className="bg-white p-4 rounded-lg shadow-sm w-full max-w-md">
                <div className="mb-2">
                  <span className="text-gray-500 text-sm">Ticket ID:</span>
                  <p className="font-medium">{ticketInfo.ticketId}</p>
                </div>
                <div className="mb-4">
                  <span className="text-gray-500 text-sm">Ticket Number:</span>
                  <p className="font-medium">{ticketInfo.ticketNumber}</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => navigate(`/verify/${ticketInfo.ticketId}/${ticketInfo.ticketNumber}`)}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Verify Ticket
                  </button>
                  <button
                    onClick={resetScanner}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Scan Another
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {scanning && (
            <div className="absolute top-4 right-4 bg-white/90 rounded-full p-2">
              <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
            </div>
          )}
        </div>
        
        {/* Explicit Start/Stop Scanning Buttons */}
        <div className="flex justify-center mb-6 space-x-4">
          {!scanning && !ticketInfo && (
            <button
              onClick={startScanning}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <QrCode className="h-5 w-5 mr-2" />
              Start Scanning
            </button>
          )}
          
          {scanning && (
            <button
              onClick={stopScanning}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Stop Scanning
            </button>
          )}
          
          {ticketInfo && (
            <button
              onClick={resetScanner}
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-full shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Scan Another Ticket
            </button>
          )}
        </div>

        {/* Error Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  // For permission errors, we need to request again
                  if (error.includes('access denied') || error.includes('not available')) {
                    setTimeout(startScanning, 500); // Small delay before retrying
                  } else {
                    startScanning();
                  }
                }}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Usage Instructions */}
        {!ticketInfo && (
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Instructions</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>1. Click "Start Scanning" to activate the camera</li>
              <li>2. Point the camera at a ticket's QR code</li>
              <li>3. Hold steady until the code is recognized</li>
              <li>4. Ticket information will be displayed</li>
              <li>5. Choose to verify the ticket or scan another</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};