import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Printer } from 'lucide-react';
import type { Product } from '@/types/index';
import { PDFDocument } from 'pdf-lib';
// @ts-ignore
import bwipjs from 'bwip-js';

interface BarcodePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  shopName: string;
}

export function BarcodePrintDialog({ open, onOpenChange, product, shopName }: BarcodePrintDialogProps) {
  const [qty, setQty] = useState('21');
  const [weight, setWeight] = useState('0.454');
  const [loading, setLoading] = useState(false);

  const isWeighed = product?.unit === 'kg' || product?.unit === 'g';

  const handlePrint = async () => {
    if (!product) return;
    setLoading(true);
    try {
      const q = parseInt(qty) || 1;
      const w = parseFloat(weight) || 0;
      const unitPrice = product.price;
      const totalPrice = (unitPrice * w).toFixed(2);

      const pdfDoc = await PDFDocument.create();
      const cols = 3, rows = 7;
      const pageWidth = 595, pageHeight = 842; // A4 size
      const labelWidth = pageWidth / cols, labelHeight = pageHeight / rows;

      let page = pdfDoc.addPage([pageWidth, pageHeight]);

      for (let i = 0; i < q; i++) {
        if (i > 0 && i % (cols * rows) === 0) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
        }
        const index = i % (cols * rows);
        const row = Math.floor(index / cols);
        const col = index % cols;
        const x = 5 + col * labelWidth;
        const y = pageHeight - 10 - (row + 1) * labelHeight;
        const centerX = x + labelWidth / 2;

        page.drawText(product.barcode, { x: centerX - 25, y: y + labelHeight - 12, size: 9 });
        page.drawText(product.name.substring(0, 18).toUpperCase(), { x: x + 5, y: y + labelHeight - 25, size: 8 });

        // Generate barcode on a temporary canvas
        const canvas = document.createElement('canvas');
        bwipjs.toCanvas(canvas, {
          bcid: 'code128',
          text: product.barcode,
          scale: 3,
          height: 10,
          includetext: false,
        });
        const pngUrl = canvas.toDataURL('image/png');
        const barcodePngBytes = await fetch(pngUrl).then(res => res.arrayBuffer());
        const barcodeImage = await pdfDoc.embedPng(barcodePngBytes);

        page.drawImage(barcodeImage, { x: x + 10, y: y + labelHeight - 60, width: labelWidth - 20, height: 30 });

        const randomNum = Math.floor(100000 + Math.random() * 900000);
        page.drawText(`${product.barcode}.${randomNum}`, { x: centerX - 35, y: y + labelHeight - 65, size: 7 });

        if (isWeighed) {
          page.drawText(`Unit Price : ${unitPrice.toFixed(2)} Rs./kg`, { x: x + 5, y: y + labelHeight - 80, size: 8 });
          page.drawRectangle({ x: x + 5, y: y + 18, width: labelWidth / 2 - 8, height: 20, borderWidth: 1 });
          page.drawText(`Weight (kg)\n${w.toFixed(3)}`, { x: x + 8, y: y + 28, size: 7 });
          page.drawRectangle({ x: x + labelWidth / 2, y: y + 18, width: labelWidth / 2 - 8, height: 20, borderWidth: 1 });
          page.drawText(`Total Price (Rs.)\n${totalPrice}`, { x: x + labelWidth / 2 + 3, y: y + 28, size: 7 });
        } else {
          page.drawText(`Price : Rs. ${unitPrice.toFixed(2)}`, { x: centerX - 35, y: y + labelHeight - 80, size: 10 });
        }

        const shopNameText = shopName || 'SHOP';
        page.drawText(shopNameText, { x: centerX - (shopNameText.length * 2.5), y: y + 5, size: 9 });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const wnd = window.open(url, '_blank');
      if (wnd) {
        wnd.onload = () => wnd.print();
      } else {
        toast.error('PDF විවෘත කිරීමට නොහැක. Pop-up blocker එකක් සක්‍රීය වී ඇතිදැයි බලන්න.');
      }
      
      onOpenChange(false);
    } catch (error: any) {
      toast.error('මුද්‍රණ දෝෂයක්: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" />
            Barcode මුද්‍රණය
          </DialogTitle>
          <DialogDescription>
            {product?.name} සඳහා ලේබල් මුද්‍රණය කිරීම. A4 පිටුවක තීරු 3ක් සහ පේළි 7ක් බැගින් ලේබල් 21ක් ඇත.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-normal">මුද්‍රණය කළ යුතු ප්‍රමාණය (ලේබල් ගණන)</Label>
            <Input
              type="number"
              min="1"
              value={qty}
              onChange={e => setQty(e.target.value)}
              className="px-3"
            />
          </div>

          {isWeighed && (
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">බර (Weight) - {product.unit}</Label>
              <Input
                type="number"
                step="0.001"
                min="0.001"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                className="px-3"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Total: Rs. {((product?.price || 0) * (parseFloat(weight) || 0)).toFixed(2)}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            අවලංගු
          </Button>
          <Button onClick={handlePrint} disabled={loading} className="gap-2">
            <Printer className="w-4 h-4" />
            {loading ? 'මුද්‍රණය කරමින්...' : 'මුද්‍රණය (Print PDF)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
