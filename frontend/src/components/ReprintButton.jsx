import React, { useState, useEffect } from 'react';
import { FiPrinter } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import PrintReceipt from '@/components/PrintReceipt';
import ThermalPrinter from '@/services/printer';

const STORE_INFO = {
  name: 'Tuck Shop POS',
  address: 'Main Street, City',
  phone: '0300-1234567',
  logo: '🏪',
};

export default function ReprintButton({ variant = 'ghost', size = 'sm', className = '', onReprint }) {
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);

  useEffect(() => {
    if (showPrintModal) {
      const printer = new ThermalPrinter();
      setLastReceipt(printer.getLastReceipt());
    }
  }, [showPrintModal]);

  const handleReprint = () => {
    const printer = new ThermalPrinter();
    const receipt = printer.getLastReceipt();
    if (receipt) {
      setLastReceipt(receipt);
      setShowPrintModal(true);
      if (onReprint) onReprint(receipt);
    }
  };

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={handleReprint} title="Reprint Last Receipt">
        <FiPrinter className="w-4 h-4 mr-1" /> Reprint
      </Button>

      <PrintReceipt
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        orderData={lastReceipt}
        storeInfo={STORE_INFO}
      />
    </>
  );
}
