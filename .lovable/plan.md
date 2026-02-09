
## Perbaikan Copy Rincian Tagihan pada Perpanjangan Kontrak

### Masalah
Saat perpanjangan kontrak dari 000284 ke 000301, beberapa data penting **tidak ikut tercopy**:
- `rincian_template` (Rincian Tagihan)
- `discount`
- `transport_cost_delivery`
- `transport_cost_pickup`

Padahal line items, groups, dan stock items sudah berhasil tercopy.

### Solusi: Re-generate Template + Copy Fields Terkait

Karena template berisi tanggal yang berubah (periode sewa baru), **TIDAK** bisa copy template langsung. Yang benar adalah:
1. Copy fields finansial (`discount`, `transport_cost_delivery`, `transport_cost_pickup`)
2. Re-generate `rincian_template` dari data yang sudah tercopy

### Perubahan Kode

#### File: `src/components/contracts/ExtendContractDialog.tsx`

**1. Tambah fetch data finansial dari parent contract saat insert**

Di bagian insert kontrak baru (baris 208-229), tambahkan fields yang hilang:

```typescript
// 2. Insert new contract - with financial fields from parent
const { data: parentContract } = await supabase
  .from('rental_contracts')
  .select('discount, transport_cost_delivery, transport_cost_pickup, whatsapp_template_mode')
  .eq('id', contract.id)
  .single();

const { data: newContract, error: insertError } = await supabase
  .from('rental_contracts')
  .insert({
    user_id: user.id,
    client_group_id: contract.client_group_id,
    start_date: format(startDate, "yyyy-MM-dd"),
    end_date: format(endDate, "yyyy-MM-dd"),
    status: 'masa sewa',
    invoice: invoiceNumber,
    parent_contract_id: contract.id,
    extension_number: (contract.extension_number ?? 0) + 1,
    is_flexible_duration: durationMode === 'flexible',
    tagihan: transferUnpaidBalance ? contract.tagihan_belum_bayar : 0,
    tagihan_belum_bayar: transferUnpaidBalance ? contract.tagihan_belum_bayar : 0,
    keterangan: contract.keterangan,
    bank_account_id: contract.bank_account_id,
    google_maps_link: contract.google_maps_link,
    notes: `Perpanjangan dari ${contract.invoice}`,
    tanggal_kirim: format(startDate, "yyyy-MM-dd"),
    // === COPY FINANCIAL FIELDS ===
    discount: parentContract?.discount || 0,
    transport_cost_delivery: parentContract?.transport_cost_delivery || 0,
    transport_cost_pickup: parentContract?.transport_cost_pickup || 0,
    whatsapp_template_mode: parentContract?.whatsapp_template_mode || false,
  } as any)
  .select('id')
  .single();
```

**2. Tambah regenerasi template setelah semua data tercopy**

Setelah copy line items dan groups berhasil (sekitar baris 420), generate ulang template:

```typescript
// 7. Generate rincian_template dari data yang tercopy
if (newContract && copiedLineItemsCount > 0) {
  console.log(`[Extension v2.2] Generating rincian_template...`);
  
  // Fetch copied data
  const { data: copiedLineItems } = await supabase
    .from('contract_line_items')
    .select('*')
    .eq('contract_id', newContract.id)
    .order('sort_order');
  
  const { data: copiedGroups } = await supabase
    .from('contract_line_item_groups')
    .select('*')
    .eq('contract_id', newContract.id)
    .order('sort_order');

  if (copiedLineItems && copiedLineItems.length > 0) {
    // Import template generator
    const { generateRincianTemplate } = await import('@/lib/contractTemplateGenerator');
    
    // Build group data for template
    const templateGroups = (copiedGroups || []).map(group => {
      const itemIndices = copiedLineItems
        .map((item, idx) => item.group_id === group.id ? idx : -1)
        .filter(idx => idx >= 0);
      
      return {
        billing_quantity: group.billing_quantity,
        billing_unit_price_per_day: Number(group.billing_unit_price_per_day),
        billing_duration_days: group.billing_duration_days,
        billing_unit_mode: group.billing_unit_mode as 'pcs' | 'set',
        item_indices: itemIndices,
      };
    });

    // Prepare template data
    const templateData = {
      lineItems: copiedLineItems.map(item => ({
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price_per_day: Number(item.unit_price_per_day),
        duration_days: item.duration_days,
        unit_mode: item.unit_mode as 'pcs' | 'set',
        pcs_per_set: item.pcs_per_set || 1,
      })),
      groups: templateGroups,
      transportDelivery: parentContract?.transport_cost_delivery || 0,
      transportPickup: parentContract?.transport_cost_pickup || 0,
      contractTitle: contract.keterangan || '',
      discount: parentContract?.discount || 0,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      priceMode: 'set' as const,
    };

    // Generate template
    const whatsappMode = parentContract?.whatsapp_template_mode || false;
    const generatedTemplate = generateRincianTemplate(templateData, whatsappMode);
    
    // Calculate tagihan from template
    const { calculateGrandTotal } = await import('@/lib/contractTemplateGenerator');
    const grandTotal = calculateGrandTotal(templateData);

    // Update contract with template and tagihan
    const { error: updateTemplateError } = await supabase
      .from('rental_contracts')
      .update({
        rincian_template: generatedTemplate,
        tagihan: grandTotal,
        tagihan_belum_bayar: transferUnpaidBalance 
          ? (contract.tagihan_belum_bayar + grandTotal - (parentContract?.discount || 0))
          : grandTotal,
      })
      .eq('id', newContract.id);

    if (updateTemplateError) {
      console.error('[Extension v2.2] Error updating template:', updateTemplateError);
    } else {
      console.log(`[Extension v2.2] ✅ Template generated, tagihan: ${grandTotal}`);
    }
  }
}
```

### Ringkasan Perubahan

| Item | Aksi |
|------|------|
| `discount` | Copy dari parent |
| `transport_cost_delivery` | Copy dari parent |
| `transport_cost_pickup` | Copy dari parent |
| `whatsapp_template_mode` | Copy dari parent |
| `rincian_template` | Re-generate setelah data tercopy |
| `tagihan` | Recalculate dari template |

### Expected Result

Setelah perpanjangan:

```
Kontrak 000284 (Parent):
- 7 line items, 1 group
- Discount: Rp 7.000
- Transport: Rp 225.000 + Rp 225.000
- Template: ✅ Lengkap
- Total Tagihan: Rp 800.000

         ↓ PERPANJANGAN

Kontrak 000302 (Extension):
- 7 line items ✅ (tercopy)
- 1 group ✅ (tercopy)
- Discount: Rp 7.000 ✅ (tercopy)
- Transport: Rp 225.000 + Rp 225.000 ✅ (tercopy)
- Template: ✅ (di-generate ulang dengan tanggal baru)
- Total Tagihan: ✅ (dihitung ulang)
```

### Technical Notes

**Mengapa regenerate template, bukan copy langsung?**

Template berisi:
- Periode Sewa: `Mulai: 26 Jan 2026 - Selesai: 01 Feb 2026`

Jika dicopy langsung, tanggalnya salah untuk kontrak perpanjangan. Jadi harus di-generate ulang dengan tanggal baru.

**File yang diubah:**
- `src/components/contracts/ExtendContractDialog.tsx`
