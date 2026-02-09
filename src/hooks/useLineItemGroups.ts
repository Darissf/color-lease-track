import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LineItemGroup {
  id?: string;
  contract_id: string;
  group_name?: string;
  billing_quantity: number;
  billing_unit_price_per_day: number;
  billing_duration_days: number;
  billing_unit_mode: 'pcs' | 'set';
  sort_order: number;
  item_ids: string[]; // Local tracking of which items are in this group
}

export interface GroupedLineItem {
  id?: string;
  item_name: string;
  quantity: number;
  unit_price_per_day: number;
  duration_days: number;
  unit_mode?: 'pcs' | 'set';
  pcs_per_set?: number;
  group_id?: string | null;
  local_index: number; // For tracking before save
}

export function useLineItemGroups(contractId: string, userId: string | undefined) {
  const [groups, setGroups] = useState<LineItemGroup[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  // Fetch existing groups from database
  const fetchGroups = useCallback(async () => {
    if (!contractId) return;
    
    const { data, error } = await supabase
      .from('contract_line_item_groups')
      .select('*')
      .eq('contract_id', contractId)
      .order('sort_order');
    
    if (error) {
      console.error('Error fetching groups:', error);
      return;
    }

    // Also fetch all line items with their sort_order and group_id
    const { data: lineItems } = await supabase
      .from('contract_line_items')
      .select('id, group_id, sort_order')
      .eq('contract_id', contractId)
      .order('sort_order');

    // Build a map from group_id to list of local indices (based on sort_order)
    const groupIdToLocalIndices = new Map<string, number[]>();
    lineItems?.forEach(li => {
      if (li.group_id) {
        const indices = groupIdToLocalIndices.get(li.group_id) || [];
        // sort_order is the local index
        indices.push(li.sort_order ?? 0);
        groupIdToLocalIndices.set(li.group_id, indices);
      }
    });

    // Only include groups that have items linked to them (filter orphan groups)
    const groupsWithItems: LineItemGroup[] = (data || [])
      .map(g => {
        const localIndices = groupIdToLocalIndices.get(g.id) || [];
        
        return {
          id: g.id,
          contract_id: g.contract_id,
          group_name: g.group_name || undefined,
          billing_quantity: g.billing_quantity,
          billing_unit_price_per_day: Number(g.billing_unit_price_per_day),
          billing_duration_days: g.billing_duration_days,
          billing_unit_mode: (g.billing_unit_mode as 'pcs' | 'set') || 'set',
          sort_order: g.sort_order || 0,
          // Store as local_X format so saveGroups can parse them correctly
          item_ids: localIndices.map(idx => `local_${idx}`),
        };
      })
      // CRITICAL: Filter out orphan groups (groups without any linked items)
      .filter(g => g.item_ids.length > 0);

    setGroups(groupsWithItems);
  }, [contractId]);

  // Toggle item selection
  const toggleSelection = useCallback((index: number) => {
    setSelectedIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIndices(new Set());
  }, []);

  // Check if an item is in a group (by local index)
  const getGroupForIndex = useCallback((lineItems: GroupedLineItem[], index: number): LineItemGroup | undefined => {
    const item = lineItems[index];
    if (!item?.group_id) return undefined;
    return groups.find(g => g.id === item.group_id);
  }, [groups]);

  // Combine selected items into a new group
  const combineSelectedItems = useCallback(async (
    lineItems: GroupedLineItem[],
    billingQuantity: number,
    billingPricePerDay: number,
    billingDurationDays: number,
    billingUnitMode: 'pcs' | 'set'
  ): Promise<LineItemGroup | null> => {
    if (!userId || selectedIndices.size < 2) return null;

    // Check if any selected item is already in a group
    const selectedItems = Array.from(selectedIndices).map(i => lineItems[i]);
    const alreadyGrouped = selectedItems.some(item => item.group_id);
    if (alreadyGrouped) {
      toast.error('Tidak bisa combine item yang sudah di-group. Un-combine terlebih dahulu.');
      return null;
    }

    const newGroup: LineItemGroup = {
      contract_id: contractId,
      billing_quantity: billingQuantity,
      billing_unit_price_per_day: billingPricePerDay,
      billing_duration_days: billingDurationDays,
      billing_unit_mode: billingUnitMode,
      sort_order: groups.length,
      item_ids: Array.from(selectedIndices).map(i => `local_${i}`), // Temporary IDs until saved
    };

    setGroups(prev => [...prev, newGroup]);
    clearSelection();
    
    return newGroup;
  }, [contractId, userId, selectedIndices, groups.length, clearSelection]);

  // Uncombine a group
  const uncombineGroup = useCallback((groupIndex: number) => {
    setGroups(prev => prev.filter((_, i) => i !== groupIndex));
  }, []);

  // Update group billing values
  const updateGroupBilling = useCallback((
    groupIndex: number, 
    field: 'billing_quantity' | 'billing_unit_price_per_day' | 'billing_duration_days' | 'billing_unit_mode',
    value: number | string
  ) => {
    setGroups(prev => {
      const updated = [...prev];
      if (field === 'billing_unit_mode') {
        updated[groupIndex] = { ...updated[groupIndex], [field]: value as 'pcs' | 'set' };
      } else if (field === 'billing_quantity' || field === 'billing_duration_days') {
        // Integer fields - round to prevent database errors
        updated[groupIndex] = { ...updated[groupIndex], [field]: Math.round(Number(value)) };
      } else {
        updated[groupIndex] = { ...updated[groupIndex], [field]: Number(value) };
      }
      return updated;
    });
  }, []);

  // Save groups to database - returns map of groupIndex -> groupId AND map of localIndex -> groupId
  const saveGroups = useCallback(async (lineItemIds: string[]): Promise<{ 
    success: boolean; 
    groupIdMap: Map<number, string>;
    indexToGroupIdMap: Map<number, string>;
  }> => {
    if (!userId) return { success: false, groupIdMap: new Map<number, string>(), indexToGroupIdMap: new Map<number, string>() };

    setLoading(true);
    const groupIdMap = new Map<number, string>();
    const indexToGroupIdMap = new Map<number, string>();

    try {
      // Delete existing groups for this contract
      await supabase
        .from('contract_line_item_groups')
        .delete()
        .eq('contract_id', contractId);

      // Only insert groups that have items - CRITICAL: Skip orphan groups
      let insertedGroupIndex = 0;
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        
        // Parse item_ids to get local indices
        const localIndices = group.item_ids
          .filter(id => id.startsWith('local_'))
          .map(id => parseInt(id.replace('local_', ''), 10))
          .filter(idx => !isNaN(idx) && idx >= 0);
        
        // CRITICAL: Skip groups with no valid items (prevents orphan groups)
        if (localIndices.length === 0) {
          console.log(`Skipping orphan group ${i} - no valid items`);
          continue;
        }
        
        const { data: insertedGroup, error } = await supabase
          .from('contract_line_item_groups')
          .insert({
            user_id: userId,
            contract_id: contractId,
            group_name: group.group_name,
            billing_quantity: Math.round(group.billing_quantity),
            billing_unit_price_per_day: group.billing_unit_price_per_day,
            billing_duration_days: Math.round(group.billing_duration_days),
            billing_unit_mode: group.billing_unit_mode,
            sort_order: insertedGroupIndex,
          })
          .select()
          .single();

        if (error) throw error;
        if (insertedGroup) {
          groupIdMap.set(i, insertedGroup.id);
          
          // Map each local index to this group ID
          localIndices.forEach(localIdx => {
            indexToGroupIdMap.set(localIdx, insertedGroup.id);
          });
          insertedGroupIndex++;
        }
      }

      return { success: true, groupIdMap, indexToGroupIdMap };
    } catch (error) {
      console.error('Error saving groups:', error);
      toast.error('Gagal menyimpan groups');
      return { success: false, groupIdMap, indexToGroupIdMap };
    } finally {
      setLoading(false);
    }
  }, [contractId, userId, groups]);

  // Calculate group subtotal
  const calculateGroupSubtotal = useCallback((group: LineItemGroup): number => {
    return group.billing_quantity * group.billing_unit_price_per_day * group.billing_duration_days;
  }, []);

  // Get indices that belong to a group
  const getIndicesInGroup = useCallback((lineItems: GroupedLineItem[], groupIndex: number): number[] => {
    const group = groups[groupIndex];
    if (!group || !group.item_ids || group.item_ids.length === 0) return [];
    
    // Parse local indices from item_ids (format: "local_X")
    const localIndices = new Set(
      group.item_ids
        .filter(id => id.startsWith('local_'))
        .map(id => parseInt(id.replace('local_', ''), 10))
        .filter(idx => !isNaN(idx) && idx >= 0)
    );
    
    // If no valid local indices, return empty
    if (localIndices.size === 0 && !group.id) return [];
    
    return lineItems
      .map((item, idx) => ({ item, idx }))
      .filter(({ item, idx }) => {
        // Check by local index tracking
        if (localIndices.has(idx)) return true;
        // Also check by saved group_id for existing items
        if (item.group_id && item.group_id === group.id) return true;
        return false;
      })
      .map(({ idx }) => idx);
  }, [groups]);

  // Add indices to an existing group
  const addIndicesToGroup = useCallback((groupIndex: number, indices: number[]) => {
    setGroups(prev => {
      const updated = [...prev];
      const group = updated[groupIndex];
      const newItemIds = [...group.item_ids, ...indices.map(i => `local_${i}`)];
      updated[groupIndex] = { ...group, item_ids: newItemIds };
      return updated;
    });
    clearSelection();
  }, [clearSelection]);

  // Check if item at index is in any group
  const isIndexInGroup = useCallback((lineItems: GroupedLineItem[], index: number): boolean => {
    const item = lineItems[index];
    if (item?.group_id) return true;
    return groups.some(g => g.item_ids.includes(`local_${index}`));
  }, [groups]);

  // Get group index for an item
  const getGroupIndexForItem = useCallback((lineItems: GroupedLineItem[], itemIndex: number): number => {
    const item = lineItems[itemIndex];
    if (!item) return -1;
    
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (item.group_id && item.group_id === group.id) return i;
      if (group.item_ids.includes(`local_${itemIndex}`)) return i;
    }
    
    return -1;
  }, [groups]);

  return {
    groups,
    setGroups,
    selectedIndices,
    toggleSelection,
    clearSelection,
    fetchGroups,
    combineSelectedItems,
    uncombineGroup,
    updateGroupBilling,
    saveGroups,
    calculateGroupSubtotal,
    getIndicesInGroup,
    addIndicesToGroup,
    isIndexInGroup,
    getGroupIndexForItem,
    loading,
  };
}
