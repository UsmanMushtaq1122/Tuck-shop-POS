import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiPrinter, FiX, FiEye, FiDownload } from 'react-icons/fi';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import ThermalPrinter from '@/services/printer';
import { formatCurrency } from '@/lib/utils';

export default function PrintReceipt({ isOpen, onClose, orderData, storeInfo }) {
  const [paperWidth, setPaperWidth] = useState(80);
  const [showPreview, setShowPreview] = useState(false);

  const printer = useMemo(() => new ThermalPrinter({ paperWidth }), [paperWidth]);

  const htmlReceipt = useMemo(() => {
    if (!orderData) return '';
    return printer.printPreviewHtml({
      ...orderData,
      shopName: storeInfo?.name || 'Tuck Shop POS',
      shopAddress: storeInfo?.address || 'Main Street, City',
      shopPhone: storeInfo?.phone || '0300-1234567',
      shopLogo: storeInfo?.logo || '🏪',
    });
  }, [orderData, printer, storeInfo]);

  const handlePrint = () => {
    const text = printer.generateTextReceipt({
      ...orderData,
      shopName: storeInfo?.name || 'Tuck Shop POS',
      shopAddress: storeInfo?.address || 'Main Street, City',
      shopPhone: storeInfo?.phone || '0300-1234567',
      shopLogo: storeInfo?.logo || '🏪',
    });
    printer.printText(text);
  };

  const handlePrintHtml = () => {
    printer.printHtml(htmlReceipt);
  };

  if (!orderData) return null;

  return (
    <Modal open={isOpen} onClose={onClose} title="Print Receipt" size="md">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-xs text-foreground-muted mb-1 block">Paper Size</label>
            <div className="flex gap-2">
              {[58, 80].map(size => (
                <button
                  key={size}
                  onClick={() => setPaperWidth(size)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    paperWidth === size
                      ? 'bg-accent text-white'
                      : 'bg-background-tertiary text-foreground-secondary hover:bg-border'
                  }`}
                >
                  {size}mm
                </button>
              ))}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-foreground-muted">Order</p>
            <p className="text-sm font-bold">{orderData.order_number}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={handlePrint}>
            <FiPrinter className="w-4 h-4 mr-2" /> Print Text
          </Button>
          <Button variant="secondary" className="flex-1" onClick={handlePrintHtml}>
            <FiPrinter className="w-4 h-4 mr-2" /> Print Formatted
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="w-full"
          >
            <FiEye className="w-4 h-4 mr-2" />
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
        </div>

        {showPreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="border border-border rounded-xl overflow-hidden"
          >
            <div className="bg-white max-h-96 overflow-y-auto" dangerouslySetInnerHTML={{ __html: htmlReceipt }} />
          </motion.div>
        )}

        <div className="flex justify-between items-center text-xs text-foreground-muted pt-2 border-t border-border">
          <span>{orderData.items?.length || 0} items</span>
          <span className="font-medium text-foreground">{formatCurrency(orderData.total || 0)}</span>
        </div>
      </div>
    </Modal>
  );
}
