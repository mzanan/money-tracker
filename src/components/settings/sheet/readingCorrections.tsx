import type { SheetRecipe, TableRecipe } from "@/lib/sheetImport/recipe";
import type { SheetGrid } from "@/lib/sheetImport/workbook";

import { TableCorrections } from "./tableCorrections";

export function ReadingCorrections({
  recipe,
  grids,
  onChange,
}: {
  recipe: SheetRecipe;
  grids: SheetGrid[];
  onChange: (index: number, patch: Partial<TableRecipe>) => void;
}) {
  return (
    <div className="grid gap-3">
      {recipe.tables.map((table, index) => {
        const grid = grids.find((g) => g.name === table.sheet);
        return grid ? (
          <TableCorrections
            key={`${table.sheet}-${index}`}
            index={index}
            table={table}
            grid={grid}
            onChange={(patch) => onChange(index, patch)}
          />
        ) : null;
      })}
    </div>
  );
}
