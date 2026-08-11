export function computeActualMarks(
  greenElements: any[],
  pd: any,
): number {
  const checkedItems: number[] = pd?.actual_checked_items ?? [];
  const checkedOptions: Record<number, number[]> = pd?.actual_checked_options ?? {};
  const selectedSelections: Record<number, number> = pd?.actual_selected_items ?? {};
  const checkedSubitems: Record<number, number[]> = pd?.actual_checked_subitems ?? {};
  const customInputs: Record<number, string[]> = pd?.actual_custom_inputs ?? [];
  let total = 0;

  for (const criterion of greenElements) {
    const allItems: any[] = [];
    if (Array.isArray(criterion.items)) allItems.push(...criterion.items);
    if (Array.isArray(criterion.subcriteria)) {
      for (const sub of criterion.subcriteria) {
        if (Array.isArray(sub.items)) allItems.push(...sub.items);
      }
    }

    for (const item of allItems) {
      const optionGroups = Array.isArray(item.option_groups) ? item.option_groups : [];
      const selectionGroups = Array.isArray(item.selection_groups) ? item.selection_groups : [];
      const subitems = Array.isArray(item.subitems) ? item.subitems : [];
      const hasSubitems = item.subitems_exist && subitems.length > 0;
      const hasSelections = selectionGroups.some(
        (g: any) => Array.isArray(g?.selections) && g.selections.length > 0,
      );
      const hasOptions = optionGroups.some(
        (g: any) => Array.isArray(g?.options) && g.options.length > 0,
      );
      const itemId = Number(item.id);

      if (hasSubitems) {
        const checked = checkedSubitems[itemId] ?? [];
        const customList = customInputs[itemId] ?? [];
        total += Math.min(checked.length + customList.length, item.marks || 6);
      } else if (hasSelections && !hasOptions) {
        for (const group of selectionGroups) {
          const selId = selectedSelections[Number(group.id)];
          const sel = (group.selections || []).find(
            (s: any) => Number(s.id) === selId,
          );
          total += sel?.marks || 0;
        }
      } else if (hasOptions && !hasSelections) {
        for (const group of optionGroups) {
          const ids = checkedOptions[Number(group.id)] ?? [];
          for (const opt of group.options || []) {
            if (ids.includes(Number(opt.id))) total += opt.marks || 0;
          }
        }
      } else if (hasSelections && hasOptions) {
        for (const group of selectionGroups) {
          const selId = selectedSelections[Number(group.id)];
          const sel = (group.selections || []).find(
            (s: any) => Number(s.id) === selId,
          );
          total += sel?.marks || 0;
        }
        for (const group of optionGroups) {
          const ids = checkedOptions[Number(group.id)] ?? [];
          for (const opt of group.options || []) {
            if (ids.includes(Number(opt.id))) total += opt.marks || 0;
          }
        }
      } else {
        if (checkedItems.includes(itemId)) total += item.marks || 0;
      }
    }
  }
  return total;
}
