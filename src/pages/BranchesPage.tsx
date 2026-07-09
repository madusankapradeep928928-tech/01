import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getBranches, addBranch, updateBranch, deleteBranch } from '@/services/branches';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Branch } from '@/types/index';
import { Building2, Plus, RefreshCw, Pencil, Trash2 } from 'lucide-react';

export default function BranchesPage() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const shopId = profile?.shop_id ?? '';
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState({
    name: '', address: '', phone: '', email: '', vat: '',
    tin: '', print_name: '', currency: '', bill_format: '', tax_rate: ''
  });
  const [saving, setSaving] = useState(false);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      setBranches(await getBranches());
    } catch {
      toast.error('ශාඛා ලබාගැනීමේ දෝෂය');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBranches(); }, [loadBranches]);

  const openAdd = () => {
    setEditBranch(null);
    setForm({
      name: '', address: '', phone: '', email: '', vat: '',
      tin: '', print_name: '', currency: '', bill_format: '', tax_rate: ''
    });
    setDialogOpen(true);
  };

  const openEdit = (b: Branch) => {
    setEditBranch(b);
    setForm({
      name: b.name,
      address: b.address ?? '',
      phone: b.phone ?? '',
      email: b.email ?? '',
      vat: b.vat ?? '',
      tin: b.tin ?? '',
      print_name: b.print_name ?? '',
      currency: b.currency ?? '',
      bill_format: b.bill_format ?? '',
      tax_rate: b.tax_rate?.toString() ?? ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('ශාඛා නාමය ඇතුළත් කරන්න'); return; }
    if (!form.phone.trim()) { toast.error('දුරකථන අංකය ඇතුළත් කරන්න'); return; }
    setSaving(true);
    try {
      const parsedTax = form.tax_rate ? parseFloat(form.tax_rate) : null;
      const dataToSave = {
        name: form.name.trim(),
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        vat: form.vat.trim() || null,
        tin: form.tin.trim() || null,
        print_name: form.print_name.trim() || null,
        currency: form.currency.trim() || null,
        bill_format: form.bill_format.trim() || null,
        tax_rate: parsedTax !== null && !isNaN(parsedTax) ? parsedTax : null,
      };

      if (editBranch) {
        await updateBranch(editBranch.id, dataToSave);
        toast.success('ශාඛාව යාවත්කාලීන කළා');
      } else {
        await addBranch({ ...dataToSave, shop_id: shopId });
        toast.success('ශාඛාව එකතු කළා');
      }
      setDialogOpen(false);
      loadBranches();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'දෝෂය';
      toast.error(msg.includes('duplicate') || msg.includes('unique') ? 'ශාඛා නාමය දැනටමත් ඇත' : msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBranch(deleteTarget.id);
      toast.success('ශාඛාව ඉවත් කළා');
      setDeleteTarget(null);
      loadBranches();
    } catch {
      toast.error('ශාඛාව ඉවත් කිරීම අසාර්ථකයි — භාණ්ඩ හෝ invoices සම්බන්ධ විය හැකිය');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-balance">{t('branches.title')}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={loadBranches} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="sr-only md:not-sr-only">යාවත්කාලීන</span>
            </Button>
            <Button size="sm" onClick={openAdd} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>නව ශාඛාව</span>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="h-full">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">සම්පූර්ණ ශාඛා</p>
              {loading ? <Skeleton className="h-7 w-12 mt-1 bg-muted" /> : (
                <p className="text-2xl font-bold mt-1 text-primary">{branches.length}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="w-full max-w-full overflow-x-auto bg-card rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">ශාඛා නාමය</TableHead>
                    <TableHead className="whitespace-nowrap">දුරකථන අංකය</TableHead>
                    <TableHead className="whitespace-nowrap">{t('common.address')}</TableHead>
                    <TableHead className="whitespace-nowrap">VAT / TIN</TableHead>
                    <TableHead className="whitespace-nowrap">ලියාපදිංචි දිනය</TableHead>
                    <TableHead className="whitespace-nowrap text-right">ක්‍රියා</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <TableCell key={j}><Skeleton className="h-5 w-full bg-muted" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : branches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground whitespace-nowrap">
                        ශාඛා නොමැත. නව ශාඛාවක් එකතු කරන්න.
                      </TableCell>
                    </TableRow>
                  ) : (
                    branches.map(b => (
                      <TableRow key={b.id}>
                        <TableCell className="whitespace-nowrap font-semibold">{b.name}</TableCell>
                        <TableCell className="whitespace-nowrap">{b.phone ?? '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{b.address ?? '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {b.vat ? `VAT: ${b.vat}` : ''} {b.tin ? `TIN: ${b.tin}` : ''}
                          {!b.vat && !b.tin && '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(b.created_at).toLocaleDateString('si-LK')}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(b)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editBranch ? 'ශාඛාව සංස්කරණය' : 'නව ශාඛාව'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">ශාඛා නාමය *</Label>
              <Input
                placeholder="ප්‍රධාන ශාඛාව"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="px-3"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">දුරකථන අංකය *</Label>
              <Input
                placeholder="011xxxxxxx"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="px-3"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-sm font-normal">ලිපිනය (විකල්ප)</Label>
              <Input
                placeholder="No. 10, කොළඹ"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="px-3"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Email ලිපිනය</Label>
              <Input
                type="email"
                placeholder="branch@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="px-3"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">මුද්‍රණ නාමය</Label>
              <Input
                placeholder="Bill Print Name"
                value={form.print_name}
                onChange={e => setForm(f => ({ ...f, print_name: e.target.value }))}
                className="px-3"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">{t('branches.vat')}</Label>
              <Input
                placeholder="VAT No"
                value={form.vat}
                onChange={e => setForm(f => ({ ...f, vat: e.target.value }))}
                className="px-3"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">{t('branches.tin')}</Label>
              <Input
                placeholder="TIN No"
                value={form.tin}
                onChange={e => setForm(f => ({ ...f, tin: e.target.value }))}
                className="px-3"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">{t('branches.currency')}</Label>
              <Input
                placeholder="LKR"
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="px-3"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">බිල් ආකෘතිය</Label>
              <Input
                placeholder="MAIN-0001"
                value={form.bill_format}
                onChange={e => setForm(f => ({ ...f, bill_format: e.target.value }))}
                className="px-3"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">බදු අනුපාතය (%)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.tax_rate}
                onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))}
                className="px-3"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'සුරකිමින්...' : (editBranch ? 'යාවත්කාලීන' : 'එකතු කරන්න')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>ශාඛාව ඉවත් කරන්නද?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" ඉවත් කිරීම ස්ථිර ක්‍රියාවකි.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              ඉවත් කරන්න
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
