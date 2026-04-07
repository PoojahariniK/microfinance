import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
}

export function PaginationControls({
  page,
  pageSize,
  totalPages,
  totalElements,
  onPageChange,
  onPageSizeChange
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between px-2 py-4 border-t">
      <div className="flex-1 text-sm text-muted-foreground">
        Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalElements)} of {totalElements} entries
      </div>
      
      <div className="flex items-center gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 25, 50].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center justify-center text-sm font-medium gap-2">
          Page 
          <input
            className="w-12 h-8 px-1 text-center font-bold border rounded-md"
            defaultValue={page + 1}
            key={page}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const p = parseInt(e.currentTarget.value);
                if (isNaN(p) || p < 1 || p > Math.max(totalPages, 1)) {
                  import("sonner").then(m => m.toast.error(`Invalid page number. Min: 1, Max: ${Math.max(totalPages, 1)}`));
                  e.currentTarget.value = (page + 1).toString();
                } else {
                  onPageChange(p - 1);
                }
              }
            }}
            onBlur={(e) => {
              const p = parseInt(e.target.value);
              if (!isNaN(p) && p !== page + 1) {
                  if (p < 1 || p > Math.max(totalPages, 1)) {
                      import("sonner").then(m => m.toast.error(`Invalid page number. Min: 1, Max: ${Math.max(totalPages, 1)}`));
                      e.target.value = (page + 1).toString();
                  } else {
                      onPageChange(p - 1);
                  }
              } else {
                  e.target.value = (page + 1).toString();
              }
            }}
          />
          of {Math.max(totalPages, 1)}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
